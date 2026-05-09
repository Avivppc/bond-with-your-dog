import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/admin";
import { LessonForm } from "./LessonForm";
import {
  updateLesson,
  deleteLesson,
  upsertQuestion,
  deleteQuestion,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function EditLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; lid: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { id: courseId, lid } = await params;
  const { saved, error } = await searchParams;
  const sb = createServiceClient();

  const { data: lesson } = await sb.from("lessons").select("*").eq("id", lid).single();
  if (!lesson) notFound();

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
        <h1 className="text-3xl font-extrabold tracking-tighter">
          Lesson {lesson.position}: {lesson.title}
        </h1>
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

      <LessonForm
        action={updateLesson}
        submitLabel="Save changes"
        defaults={{ ...lesson, course_id: courseId }}
      />

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
                        options_json: JSON.stringify(q.options, null, 2),
                        correct_json: JSON.stringify(q.correct, null, 2),
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
                  options_json:
                    '[\n  { "id": "a", "text": "Option A" },\n  { "id": "b", "text": "Option B" }\n]',
                  correct_json: '["a"]',
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

function QuestionForm({
  defaults,
}: {
  defaults: {
    id?: string;
    lesson_id: string;
    course_id: string;
    position: number;
    prompt: string;
    kind: "single" | "multi" | "tf";
    options_json: string;
    correct_json: string;
    explanation: string;
  };
}) {
  return (
    <form action={upsertQuestion} className="flex flex-col gap-4">
      {defaults.id && <input type="hidden" name="id" value={defaults.id} />}
      <input type="hidden" name="lesson_id" value={defaults.lesson_id} />
      <input type="hidden" name="course_id" value={defaults.course_id} />

      <div className="grid grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Position
          </span>
          <input
            name="position"
            type="number"
            defaultValue={defaults.position}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Kind</span>
          <select
            name="kind"
            defaultValue={defaults.kind}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white"
          >
            <option value="single">Single choice</option>
            <option value="multi">Multiple choice</option>
            <option value="tf">True / False</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Prompt</span>
        <textarea
          name="prompt"
          rows={2}
          defaultValue={defaults.prompt}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white resize-none"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Options (JSON)
        </span>
        <textarea
          name="options_json"
          rows={5}
          defaultValue={defaults.options_json}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-xs"
        />
        <span className="text-xs text-slate-500">
          For single/multi: <code>[{`{"id":"a","text":"..."}`}, ...]</code>. For tf: <code>[]</code>.
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Correct answer (JSON)
        </span>
        <textarea
          name="correct_json"
          rows={2}
          defaultValue={defaults.correct_json}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono text-xs"
        />
        <span className="text-xs text-slate-500">
          single: <code>[&quot;a&quot;]</code> · multi: <code>[&quot;a&quot;,&quot;c&quot;]</code> · tf: <code>[true]</code>.
        </span>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Explanation (shown after answering)
        </span>
        <textarea
          name="explanation"
          rows={2}
          defaultValue={defaults.explanation}
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white resize-none"
        />
      </label>

      <button
        type="submit"
        className="bg-orange-700 text-white px-5 py-2.5 rounded-full font-bold text-xs self-start"
      >
        Save question
      </button>
    </form>
  );
}
