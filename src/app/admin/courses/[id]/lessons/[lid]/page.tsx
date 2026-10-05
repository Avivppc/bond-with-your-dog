import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/admin";
import { buildOutline } from "@/lib/course-outline";
import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY, Card, Notice, PageHeader } from "@/app/admin/_components/ui";
import { ConfirmSubmit } from "@/app/admin/_components/ConfirmSubmit";
import { AccessCard, LESSON_FORM_ID, LengthField, LessonDetailsCard, LessonFormRoot, StatusCard, type ModuleChoice } from "./LessonForm";
import { LessonThumbnailCard } from "./LessonThumbnailCard";
import { QuestionForm, type QuestionDefaults } from "./QuestionForm";
import { VideoPanel } from "./VideoPanel";
import { BodyEditor } from "./BodyEditor";
import { FilesPanel } from "./FilesPanel";
import { PracticeCard, TakeawaysCuesCard } from "./PracticeCards";
import { readTextList } from "@/lib/content/lists";
import { readPracticeSteps } from "@/lib/content/practice-steps";
import type { LessonVideoSummary } from "./content-actions";
import { updateLesson, deleteLesson, deleteQuestion, duplicateLesson } from "../actions";

export const metadata = { title: "Lesson" };

const SAVED_MESSAGES: Record<string, string> = {
  "1": "Lesson saved.",
  duplicated: "Lesson duplicated. This is the copy — it starts as a draft.",
  question: "Question saved.",
  "question-deleted": "Question deleted.",
};

export const dynamic = "force-dynamic";

export default async function EditLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; lid: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireStaff("content");
  const { id: courseId, lid } = await params;
  const { saved, error } = await searchParams;
  const sb = createServiceClient();

  const { data: lesson } = await sb.from("lessons").select("*").eq("id", lid).eq("course_id", courseId).maybeSingle();
  if (!lesson) notFound();

  const [courseRes, modulesRes, videoRes, filesRes, questionsRes] = await Promise.all([
    sb.from("courses").select("title").eq("id", courseId).single(),
    sb.from("modules").select("id, parent_id, title, position, published").eq("course_id", courseId),
    sb.from("lesson_videos").select("provider, source_url, thumbnail_url, duration_seconds").eq("lesson_id", lid).maybeSingle(),
    sb.from("lesson_files").select("id, file_name, size_bytes").eq("lesson_id", lid).order("position"),
    lesson.kind === "quiz"
      ? sb.from("quiz_questions").select("*").eq("lesson_id", lid).order("position", { ascending: true })
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const video: LessonVideoSummary | null = videoRes.data
    ? {
        provider: videoRes.data.provider as LessonVideoSummary["provider"],
        sourceUrl: videoRes.data.source_url,
        thumbnailUrl: videoRes.data.thumbnail_url,
        durationSeconds: videoRes.data.duration_seconds,
      }
    : null;
  const modules: ModuleChoice[] = buildOutline(modulesRes.data ?? [], []).modules.flatMap((m) => [
    { id: m.id, label: m.title },
    ...m.submodules.map((s) => ({ id: s.id, label: `${m.title} › ${s.title}` })),
  ]);
  const defaults = { ...lesson, course_id: courseId };
  const questions = questionsRes.data ?? [];

  return (
    <div>
      <PageHeader
        title={lesson.title}
        crumbs={[
          { label: "Courses", href: "/admin/courses" },
          { label: courseRes.data?.title ?? "Course", href: `/admin/courses/${courseId}` },
          { label: lesson.title },
        ]}
        actions={
          <>
            <Link href={`/learn/${courseId}/${lid}`} target="_blank" className={BTN_SECONDARY}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden>
                visibility
              </span>
              Preview
            </Link>
            <button type="submit" form={LESSON_FORM_ID} className={BTN_PRIMARY}>
              Save
            </button>
          </>
        }
      />

      {(saved || error) && (
        <div className="mb-5">{error ? <Notice tone="error">{error}</Notice> : <Notice tone="success">{SAVED_MESSAGES[saved ?? ""] ?? SAVED_MESSAGES["1"]}</Notice>}</div>
      )}

      <LessonFormRoot action={updateLesson} defaults={defaults} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <LessonDetailsCard defaults={defaults} modules={modules} />
          {lesson.kind === "video" && <VideoPanel courseId={courseId} lessonId={lid} video={video} />}
          {lesson.kind === "quiz" && (
            <QuestionsCard courseId={courseId} lessonId={lid} passThreshold={lesson.pass_threshold} questions={questions} />
          )}
          <BodyEditor formId={LESSON_FORM_ID} initialHtml={lesson.body_html ?? ""} />
          <TakeawaysCuesCard formId={LESSON_FORM_ID} takeaways={readTextList(lesson.key_takeaways)} cues={readTextList(lesson.cues)} />
          <PracticeCard formId={LESSON_FORM_ID} minutes={lesson.practice_minutes ?? null} steps={readPracticeSteps(lesson.practice_steps)} />
          <FilesPanel courseId={courseId} lessonId={lid} files={filesRes.data ?? []} />
        </div>

        <aside className="space-y-6">
          <StatusCard published={lesson.published} />
          <AccessCard defaults={defaults} />
          <LessonThumbnailCard courseId={courseId} lessonId={lid} uploadUrl={lesson.thumbnail_upload_url ?? null} videoThumbnailUrl={video?.thumbnailUrl ?? null}>
            {lesson.kind === "video" && <LengthField durationSeconds={lesson.duration_seconds} />}
          </LessonThumbnailCard>
          <Card title="Duplicate lesson" description="Copies the video, text, quiz, practice steps, downloads and thumbnail into a new draft right below this one.">
            <form action={duplicateLesson}>
              <input type="hidden" name="id" value={lid} />
              <input type="hidden" name="course_id" value={courseId} />
              <button type="submit" className={BTN_SECONDARY}>
                <span className="material-symbols-outlined text-[18px]" aria-hidden>
                  content_copy
                </span>
                Duplicate lesson
              </button>
            </form>
          </Card>
          <Card title="Delete lesson" description="Removes the lesson, its files and students' progress on it.">
            <form action={deleteLesson}>
              <input type="hidden" name="id" value={lid} />
              <input type="hidden" name="course_id" value={courseId} />
              <ConfirmSubmit className={BTN_DANGER} message={`Delete "${lesson.title}"? Its files and students' progress on it are deleted too.`}>
                Delete lesson
              </ConfirmSubmit>
            </form>
          </Card>
        </aside>
      </div>

      <div className="mt-6 flex justify-end border-t border-[#e7e6e4] pt-5">
        <button type="submit" form={LESSON_FORM_ID} className={BTN_PRIMARY}>
          Save
        </button>
      </div>
    </div>
  );
}

interface QuestionRow {
  id: string;
  position: number;
  prompt: string;
  kind: string;
  options: unknown;
  correct: unknown;
  explanation: string | null;
}

function QuestionsCard({
  courseId,
  lessonId,
  passThreshold,
  questions,
}: {
  courseId: string;
  lessonId: string;
  passThreshold: number;
  questions: readonly QuestionRow[];
}) {
  return (
    <Card title="Questions" description={`Auto-graded. Students pass with ${passThreshold}% or more.`}>
      <div className="space-y-2">
        {questions.length === 0 && <p className="text-sm text-[#6c6a69]">No questions yet.</p>}
        {questions.map((q) => (
          <details key={q.id} className="rounded-[8px] border border-[#efeeed]">
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="font-medium">
                {q.position}. {q.prompt}
              </span>
              <span className="text-xs text-[#6c6a69]">{q.kind === "tf" ? "True / false" : q.kind === "multi" ? "Multiple answers" : "Single answer"}</span>
            </summary>
            <div className="border-t border-[#efeeed] p-4">
              <QuestionForm
                defaults={{
                  id: q.id,
                  lesson_id: lessonId,
                  course_id: courseId,
                  position: q.position,
                  prompt: q.prompt,
                  kind: q.kind as QuestionDefaults["kind"],
                  options: (q.options ?? []) as QuestionDefaults["options"],
                  correct: (q.correct ?? []) as unknown[],
                  explanation: q.explanation ?? "",
                }}
              />
              <form action={deleteQuestion} className="mt-3">
                <input type="hidden" name="id" value={q.id} />
                <input type="hidden" name="lesson_id" value={lessonId} />
                <input type="hidden" name="course_id" value={courseId} />
                <button type="submit" className="text-sm text-red-700 hover:underline">
                  Delete question
                </button>
              </form>
            </div>
          </details>
        ))}
        <details className="rounded-[8px] border border-dashed border-[#d9d8d6]">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">+ Add question</summary>
          <div className="border-t border-[#efeeed] p-4">
            <QuestionForm
              defaults={{
                lesson_id: lessonId,
                course_id: courseId,
                position: questions.length + 1,
                prompt: "",
                kind: "single",
                options: [],
                correct: [],
                explanation: "",
              }}
            />
          </div>
        </details>
      </div>
    </Card>
  );
}
