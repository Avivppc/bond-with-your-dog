import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({
  answers: z.record(z.string(), z.array(z.union([z.string(), z.boolean()]))),
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

  // Fetch lesson + questions (with correct answers — server-only)
  const [lessonRes, questionsRes] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, course_id, pass_threshold")
      .eq("id", lessonId)
      .single(),
    supabase
      .from("quiz_questions")
      .select("id, correct, explanation")
      .eq("lesson_id", lessonId),
  ]);

  if (lessonRes.error || !lessonRes.data) {
    return NextResponse.json({ error: "lesson not found" }, { status: 404 });
  }
  const lesson = lessonRes.data;
  const questions = questionsRes.data ?? [];
  if (questions.length === 0) {
    return NextResponse.json({ error: "no questions" }, { status: 400 });
  }

  // Verify enrollment
  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("course_id")
    .eq("course_id", lesson.course_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!enrollment) {
    return NextResponse.json({ error: "not enrolled" }, { status: 403 });
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

  // Record attempt
  await supabase.from("quiz_attempts").insert({
    user_id: user.id,
    lesson_id: lessonId,
    score,
    passed,
    answers: parsed.data.answers,
  });

  // If passed, mark progress complete (triggers achievement / certificate logic)
  if (passed) {
    await supabase.from("lesson_progress").upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        completed_at: new Date().toISOString(),
        watch_seconds: 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" }
    );
  }

  return NextResponse.json({ score, passed, perQuestion });
}
