import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/admin";
import { LessonForm } from "./LessonForm";
import { QuestionForm, type QuestionDefaults } from "./QuestionForm";
import { VideoPanel } from "./VideoPanel";
import { BodyEditor } from "./BodyEditor";
import { FilesPanel } from "./FilesPanel";
import type { LessonVideoSummary } from "./content-actions";
import {
  updateLesson,
  deleteLesson,
  deleteQuestion,
} from "../actions";
import { requireStaff } from "@/lib/admin";

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

  const { data: lesson } = await sb.from("lessons").select("*").eq("id", lid).eq("course_id", courseId).single();
  if (!lesson) notFound();

  const [videoRes, filesRes] = await Promise.all([
    sb
      .from("lesson_videos")
      .select("provider, source_url, thumbnail_url, duration_seconds")
      .eq("lesson_id", lid)
      .maybeSingle(),
    sb.from("lesson_files").select("id, file_name, size_bytes").eq("lesson_id", lid).order("position"),
  ]);
  const video: LessonVideoSummary | null = videoRes.data
    ? {
        provider: videoRes.data.provider as LessonVideoSummary["provider"],
        sourceUrl: videoRes.data.source_url,
        thumbnailUrl: videoRes.data.thumbnail_url,
        durationSeconds: videoRes.data.duration_seconds,
      }
    : null;

  const { data: questions } =
    lesson.kind === "quiz"
      ? await sb
          .from("quiz_questions")
          .select("*")
          .eq("lesson_id", lid)
          .order("position", { ascending: true })
      : { data: [] };

  return (
    <div className="space-y-10">
      <Link
        href={`/admin/courses/${courseId}`}
        className="text-sm font-bold text-orange-700 inline-block"
      >
        ← Course
      </Link>
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tighter">{lesson.title}</h1>
        <span className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
              lesson.published ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
            }`}
          >
            {lesson.published ? "Published" : "Draft"}
          </span>
          <Link
            href={`/learn/${courseId}/${lid}`}
            target="_blank"
            className="text-xs font-bold text-orange-700"
          >
            Preview ↗
          </Link>
        </span>
        <span
          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
            lesson.kind === "quiz"
              ? "bg-purple-100 text-purple-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {lesson.kind}
        </span>
      </header>

      {saved && (
        <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm">Saved.</div>
      )}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {decodeURIComponent(error)}
        </div>
      )}

      <LessonForm action={updateLesson} defaults={{ ...lesson, course_id: courseId }} />

      {lesson.kind === "video" && <VideoPanel courseId={courseId} lessonId={lid} video={video} />}

      <BodyEditor courseId={courseId} lessonId={lid} initialHtml={lesson.body_html ?? ""} />

      <FilesPanel courseId={courseId} lessonId={lid} files={filesRes.data ?? []} />

      {lesson.kind === "quiz" && (
        <section className="bg-white rounded-xl p-6 shadow-sm">
          <header className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-extrabold tracking-tighter">Questions</h2>
            <p className="text-xs text-slate-500">
              Questions are auto-graded. Pass threshold: {lesson.pass_threshold}%.
            </p>
          </header>

          <div className="space-y-3 mb-6">
            {questions && questions.length > 0 ? (
              questions.map((q) => (
                <details
                  key={q.id}
                  className="bg-slate-50 rounded-lg p-4"
                >
                  <summary className="cursor-pointer flex items-center justify-between">
                    <span className="font-bold text-sm">
                      {q.position}. {q.prompt}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      {q.kind}
                    </span>
                  </summary>
                  <div className="mt-4">
                    <QuestionForm
                      defaults={{
                        id: q.id,
                        lesson_id: lid,
                        course_id: courseId,
                        position: q.position,
                        prompt: q.prompt,
                        kind: q.kind,
                        options: (q.options ?? []) as QuestionDefaults["options"],
                        correct: (q.correct ?? []) as unknown[],
                        explanation: q.explanation ?? "",
                      }}
                    />
                    <form action={deleteQuestion} className="mt-3">
                      <input type="hidden" name="id" value={q.id} />
                      <input type="hidden" name="lesson_id" value={lid} />
                      <input type="hidden" name="course_id" value={courseId} />
                      <button
                        type="submit"
                        className="text-xs font-bold text-red-700 hover:underline"
                      >
                        Delete question
                      </button>
                    </form>
                  </div>
                </details>
              ))
            ) : (
              <p className="text-sm text-slate-500">No questions yet.</p>
            )}
          </div>

          <details className="bg-slate-50 rounded-lg p-4">
            <summary className="cursor-pointer font-bold text-sm">+ Add question</summary>
            <div className="mt-4">
              <QuestionForm
                defaults={{
                  lesson_id: lid,
                  course_id: courseId,
                  position: (questions?.length ?? 0) + 1,
                  prompt: "",
                  kind: "single",
                  options: [],
                  correct: [],
                  explanation: "",
                }}
              />
            </div>
          </details>
        </section>
      )}

      <section className="bg-white rounded-xl p-6 shadow-sm border border-red-100">
        <h2 className="font-bold text-red-700 mb-3">Danger zone</h2>
        <form action={deleteLesson}>
          <input type="hidden" name="id" value={lid} />
          <input type="hidden" name="course_id" value={courseId} />
          <button
            type="submit"
            className="bg-red-600 text-white px-4 py-2 rounded-full font-bold text-xs"
          >
            Delete lesson
          </button>
        </form>
      </section>
    </div>
  );
}
