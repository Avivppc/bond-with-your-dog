import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { EVENTS, trackMember } from "@/lib/analytics-server";
import { trackLessonCompleted } from "@/lib/member/lesson-analytics";

// Bounded: the answers are stored verbatim in quiz_attempts by the service role.
const MAX_QUESTIONS = 100;
const MAX_CHOICES_PER_QUESTION = 20;
const MAX_ANSWER_LENGTH = 200;

const Body = z.object({
  answers: z
    .record(
      z.string().max(MAX_ANSWER_LENGTH),
      z.array(z.union([z.string().max(MAX_ANSWER_LENGTH), z.boolean()])).max(MAX_CHOICES_PER_QUESTION)
    )
    .refine((a) => Object.keys(a).length <= MAX_QUESTIONS, "too many answers"),
});

function arraysEqualUnordered(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].map(String).sort();
  const sb = [...b].map(String).sort();
  return sa.every((v, i) => v === sb[i]);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id, course_id, pass_threshold")
    .eq("id", lessonId)
    .single();
  if (lessonError || !lesson) {
    return NextResponse.json({ error: "lesson not found" }, { status: 404 });
  }

  // Same access rule as playback and completion (enrollment, expiry, drip)
  const { data: canAccess, error: accessError } = await supabase.rpc("can_access_lesson", {
    p_lesson_id: lessonId,
  });
  if (accessError) {
    console.error("can_access_lesson failed", { lessonId, error: accessError.message });
    return NextResponse.json({ error: "could not verify access" }, { status: 500 });
  }
  if (!canAccess) {
    return NextResponse.json({ error: "no access to this lesson" }, { status: 403 });
  }

  // Answer keys are not readable by client roles (column privilege), so the
  // grader reads them with the service role — only after the access check above.
  const service = createServiceClient();
  const { data: questionRows, error: questionsError } = await service
    .from("quiz_questions")
    .select("id, correct, explanation")
    .eq("lesson_id", lessonId);
  if (questionsError) {
    console.error("quiz answer key fetch failed", { lessonId, error: questionsError.message });
    return NextResponse.json({ error: "could not load quiz" }, { status: 500 });
  }
  const questions = questionRows ?? [];
  if (questions.length === 0) {
    return NextResponse.json({ error: "no questions" }, { status: 400 });
  }

  // Grade
  const perQuestion = questions.map((q) => {
    const userAns = parsed.data.answers[q.id] ?? [];
    const correct = Array.isArray(q.correct)
      ? arraysEqualUnordered(userAns, q.correct as unknown[])
      : false;
    return { id: q.id, correct, explanation: q.explanation as string | null };
  });

  const correctCount = perQuestion.filter((p) => p.correct).length;
  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score >= (lesson.pass_threshold ?? 70);

  // Record the server-graded attempt. Clients cannot insert attempts themselves,
  // so a "passed" row always comes from this grader.
  const { error: attemptError } = await service.from("quiz_attempts").insert({
    user_id: user.id,
    lesson_id: lessonId,
    score,
    passed,
    answers: parsed.data.answers,
  });
  if (attemptError) {
    console.error("quiz attempt insert failed", { lessonId, error: attemptError.message });
    return NextResponse.json({ error: "could not save your attempt" }, { status: 500 });
  }
  // Which questions were missed, but never the answers themselves.
  trackMember(user, EVENTS.checkpointSubmitted, {
    lesson_id: lessonId,
    course_id: lesson.course_id as string,
    score,
    passed,
    question_count: questions.length,
    missed_question_ids: perQuestion.filter((p) => !p.correct).map((p) => p.id as string),
  });

  // If passed, complete the lesson (fires achievement / certificate triggers)
  if (passed) {
    const { error: completeError } = await supabase.rpc("complete_lesson", {
      p_lesson_id: lessonId,
    });
    if (completeError) {
      console.error("complete_lesson failed", { lessonId, error: completeError.message });
      return NextResponse.json(
        { error: "You passed, but we couldn't save your progress. Please submit again." },
        { status: 500 }
      );
    }
    await trackLessonCompleted(supabase, user, lessonId);
  }

  return NextResponse.json({ score, passed, perQuestion });
}
