"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { LESSON_FILES_BUCKET } from "@/lib/lesson-files";
import { buildAnswerKey } from "@/lib/quiz/answer-key";
import { sanitizeLessonHtml } from "@/lib/sanitize";
import { parseLessonContent } from "@/lib/content/lesson-content";
import { MAX_PRACTICE_MINUTES, MIN_PRACTICE_MINUTES } from "@/lib/content/limits";
import { MAX_ANSWER_ROWS } from "./[lid]/QuestionForm";

const checkbox = z.preprocess((v) => v === "on" || v === true, z.boolean());
const optionalInt = z.preprocess(
  (v) => (v === "" || v == null ? null : Number(v)),
  z.number().int().min(0).nullable().optional()
);

const MAX_BODY_CHARS = 200_000;

// Lesson details + text, saved together by the editor's single Save button.
// Video and downloads save instantly from their own panels; order lives in the outline.
const LessonSchema = z.object({
  course_id: z.string().min(1),
  title: z.string().trim().min(2).max(200),
  description: z.string().max(2000).optional(),
  kind: z.enum(["video", "quiz"]),
  duration_seconds: optionalInt,
  available_after_days: optionalInt,
  // Blank means "use the default", not 0% (which would pass every attempt).
  pass_threshold: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(0).max(100).default(70)),
  free_preview: checkbox,
  published: checkbox,
  module_id: z.preprocess((v) => (v === "" ? undefined : v), z.string().uuid().optional()),
  body_html: z.string().max(MAX_BODY_CHARS, "The lesson text is too long.").optional(),
  practice_minutes: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z
      .number({ message: "Practice time must be a number of minutes." })
      .int("Practice time must be whole minutes.")
      .min(MIN_PRACTICE_MINUTES, `Practice time: ${MIN_PRACTICE_MINUTES}–${MAX_PRACTICE_MINUTES} minutes.`)
      .max(MAX_PRACTICE_MINUTES, `Practice time: ${MIN_PRACTICE_MINUTES}–${MAX_PRACTICE_MINUTES} minutes.`)
      .nullable()
      .optional()
  ),
});

type LessonInput = z.infer<typeof LessonSchema>;

function lessonUrl(courseId: string, lessonId: string, params: Record<string, string>): string {
  return `/admin/courses/${courseId}/lessons/${lessonId}?${new URLSearchParams(params).toString()}`;
}

/** module_id is applied through placementFor (with a new position), never copied as-is. */
function omitModule<T extends { module_id?: string }>(input: T): Omit<T, "module_id"> {
  return Object.fromEntries(Object.entries(input).filter(([key]) => key !== "module_id")) as Omit<T, "module_id">;
}

/** Moving to another module appends the lesson at the end of it; the module must belong to the course. */
async function placementFor(lessonId: string, input: LessonInput): Promise<{ module_id: string; position: number } | null | "invalid"> {
  if (!input.module_id) return null;
  const sb = createServiceClient();
  const [{ data: current }, { data: target }] = await Promise.all([
    sb.from("lessons").select("module_id").eq("id", lessonId).single(),
    sb.from("modules").select("id").eq("id", input.module_id).eq("course_id", input.course_id).maybeSingle(),
  ]);
  if (!target) return "invalid";
  if (current?.module_id === input.module_id) return null;
  const { data: last } = await sb.from("lessons").select("position").eq("module_id", input.module_id).order("position", { ascending: false }).limit(1);
  return { module_id: input.module_id, position: (last?.[0]?.position ?? 0) + 1 };
}

export async function updateLesson(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const parsed = LessonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(
      `/admin/courses/${formData.get("course_id")}/lessons/${id}?error=` +
        encodeURIComponent(parsed.error.issues[0].message)
    );
  }
  const { body_html: bodyHtml, ...fields } = parsed.data;
  const details = omitModule(fields);
  const content = parseLessonContent(formData);
  if (!content.ok) redirect(lessonUrl(details.course_id, id, { error: content.error }));
  const placement = await placementFor(id, parsed.data);
  if (placement === "invalid") redirect(lessonUrl(details.course_id, id, { error: "Choose a module from this course." }));

  const { error } = await createServiceClient()
    .from("lessons")
    .update({
      ...details,
      ...(placement ?? {}),
      ...(content.value ?? {}),
      ...(bodyHtml !== undefined ? { body_html: sanitizeLessonHtml(bodyHtml) || null } : {}),
    })
    .eq("id", id)
    .eq("course_id", details.course_id);
  if (error) {
    console.error("updateLesson failed", { id, error: error.message });
    redirect(lessonUrl(details.course_id, id, { error: "Could not save the lesson." }));
  }
  revalidatePath(`/admin/courses/${details.course_id}`);
  revalidatePath(`/admin/courses/${details.course_id}/lessons/${id}`);
  revalidatePath(`/learn/${details.course_id}`);
  revalidatePath(`/learn/${details.course_id}/${id}`);
  redirect(lessonUrl(details.course_id, id, { saved: "1" }));
}

export async function deleteLesson(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  const courseId = formData.get("course_id");
  if (typeof id !== "string" || typeof courseId !== "string") return;
  const sb = createServiceClient();
  // Remove stored downloads first; their rows cascade with the lesson.
  const { data: files } = await sb.from("lesson_files").select("storage_path").eq("lesson_id", id);
  const paths = (files ?? []).map((f) => f.storage_path);
  if (paths.length > 0) {
    const { error: storageError } = await sb.storage.from(LESSON_FILES_BUCKET).remove(paths);
    if (storageError) console.error("lesson file cleanup failed", { id, error: storageError.message });
  }
  const { error } = await sb.from("lessons").delete().eq("id", id);
  if (error) {
    console.error("deleteLesson failed", { id, error: error.message });
    redirect(`/admin/courses/${courseId}/lessons/${id}?error=` + encodeURIComponent("Could not delete the lesson."));
  }
  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}`);
}

// ── Quiz questions ─────────────────────────────────────────
const QuestionSchema = z.object({
  lesson_id: z.string().uuid(),
  course_id: z.string().min(1),
  position: z.coerce.number().int().min(1),
  prompt: z.string().trim().min(2).max(1000),
  kind: z.enum(["single", "multi", "tf"]),
  explanation: z.string().max(2000).optional(),
  tf_answer: z.enum(["true", "false", ""]).optional(),
});

export async function upsertQuestion(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  const back = (params: string): never =>
    redirect(`/admin/courses/${formData.get("course_id")}/lessons/${formData.get("lesson_id")}?${params}`);

  const parsed = QuestionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back("error=" + encodeURIComponent(parsed.error.issues[0].message));

  const key = buildAnswerKey({
    kind: parsed.data.kind,
    options: Array.from({ length: MAX_ANSWER_ROWS }, (_, i) => String(formData.get(`option_${i}`) ?? "")),
    correct: formData.getAll("correct").map(Number).filter(Number.isInteger),
    tf: parsed.data.tf_answer === "true" ? true : parsed.data.tf_answer === "false" ? false : null,
  });
  if (!key.ok) return back("error=" + encodeURIComponent(key.error));

  const row = {
    lesson_id: parsed.data.lesson_id,
    position: parsed.data.position,
    prompt: parsed.data.prompt,
    kind: parsed.data.kind,
    options: key.options,
    correct: key.correct,
    explanation: parsed.data.explanation || null,
  };
  const sb = createServiceClient();
  const { error } =
    typeof id === "string" && id
      ? await sb.from("quiz_questions").update(row).eq("id", id).eq("lesson_id", row.lesson_id)
      : await sb.from("quiz_questions").insert(row);
  if (error) {
    console.error("upsertQuestion failed", { lessonId: row.lesson_id, error: error.message });
    back(
      "error=" +
        encodeURIComponent(error.code === "23505" ? "Another question already uses that order number." : "Could not save the question.")
    );
  }
  revalidatePath(`/admin/courses/${parsed.data.course_id}/lessons/${parsed.data.lesson_id}`);
  back("saved=1");
}

export async function deleteQuestion(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  const lessonId = formData.get("lesson_id");
  const courseId = formData.get("course_id");
  if (typeof id !== "string") return;
  const sb = createServiceClient();
  await sb.from("quiz_questions").delete().eq("id", id);
  revalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);
  redirect(`/admin/courses/${courseId}/lessons/${lessonId}?saved=1`);
}
