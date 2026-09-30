"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { LESSON_FILES_BUCKET } from "@/lib/lesson-files";
import { buildAnswerKey } from "@/lib/quiz/answer-key";
import { MAX_ANSWER_ROWS } from "./[lid]/QuestionForm";

const checkbox = z.preprocess((v) => v === "on" || v === true, z.boolean());
const optionalInt = z.preprocess(
  (v) => (v === "" || v == null ? null : Number(v)),
  z.number().int().min(0).nullable().optional()
);

// Lesson details. Position, module and video are managed in the outline / video panel.
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
});

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
  const sb = createServiceClient();
  const { error } = await sb.from("lessons").update(parsed.data).eq("id", id);
  if (error) {
    redirect(
      `/admin/courses/${parsed.data.course_id}/lessons/${id}?error=` +
        encodeURIComponent(error.message)
    );
  }
  revalidatePath(`/admin/courses/${parsed.data.course_id}`);
  revalidatePath(`/admin/courses/${parsed.data.course_id}/lessons/${id}`);
  revalidatePath(`/learn/${parsed.data.course_id}`);
  redirect(`/admin/courses/${parsed.data.course_id}/lessons/${id}?saved=1`);
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
