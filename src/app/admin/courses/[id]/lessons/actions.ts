"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";

const LessonSchema = z.object({
  course_id: z.string().min(1),
  position: z.coerce.number().int().min(1),
  title: z.string().min(2),
  description: z.string().optional(),
  kind: z.enum(["video", "quiz"]),
  mux_playback_id: z.string().optional(),
  mux_playback_policy: z.enum(["signed", "public"]).default("signed"),
  duration_seconds: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().nullable().optional()),
  available_after_days: z.preprocess(
    (v) => (v === "" || v == null ? null : Number(v)),
    z.number().int().min(0).nullable().optional()
  ),
  pass_threshold: z.coerce.number().int().min(0).max(100).default(70),
  free_preview: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

export async function createLesson(formData: FormData) {
  await requireAdmin();
  const parsed = LessonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(
      `/admin/courses/${formData.get("course_id")}/lessons/new?error=` +
        encodeURIComponent(parsed.error.issues[0].message)
    );
  }
  const sb = createServiceClient();
  const { data, error } = await sb.from("lessons").insert(parsed.data).select("id").single();
  if (error || !data) {
    redirect(
      `/admin/courses/${parsed.data.course_id}/lessons/new?error=` +
        encodeURIComponent(error?.message || "create failed")
    );
  }
  revalidatePath(`/admin/courses/${parsed.data.course_id}`);
  redirect(`/admin/courses/${parsed.data.course_id}/lessons/${data.id}`);
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
  await sb.from("lessons").delete().eq("id", id);
  revalidatePath(`/admin/courses/${courseId}`);
  redirect(`/admin/courses/${courseId}`);
}

// ── Quiz questions ─────────────────────────────────────────
const QuestionSchema = z.object({
  lesson_id: z.string().uuid(),
  position: z.coerce.number().int().min(1),
  prompt: z.string().min(2),
  kind: z.enum(["single", "multi", "tf"]),
  // options + correct submitted as JSON strings
  options_json: z.string(),
  correct_json: z.string(),
  explanation: z.string().optional(),
});

export async function upsertQuestion(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  const parsed = QuestionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(
      `/admin/courses/${formData.get("course_id")}/lessons/${formData.get("lesson_id")}?error=` +
        encodeURIComponent(parsed.error.issues[0].message)
    );
  }
  let options: unknown;
  let correct: unknown;
  try {
    options = JSON.parse(parsed.data.options_json);
    correct = JSON.parse(parsed.data.correct_json);
  } catch {
    redirect(
      `/admin/courses/${formData.get("course_id")}/lessons/${formData.get("lesson_id")}?error=` +
        encodeURIComponent("Options/correct must be valid JSON")
    );
  }
  const row = {
    lesson_id: parsed.data.lesson_id,
    position: parsed.data.position,
    prompt: parsed.data.prompt,
    kind: parsed.data.kind,
    options,
    correct,
    explanation: parsed.data.explanation || null,
  };
  const sb = createServiceClient();
  if (typeof id === "string" && id) {
    await sb.from("quiz_questions").update(row).eq("id", id);
  } else {
    await sb.from("quiz_questions").insert(row);
  }
  revalidatePath(`/admin/courses/${formData.get("course_id")}/lessons/${parsed.data.lesson_id}`);
  redirect(
    `/admin/courses/${formData.get("course_id")}/lessons/${parsed.data.lesson_id}?saved=1`
  );
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
