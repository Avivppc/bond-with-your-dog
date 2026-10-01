"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { buildAnswerKey } from "@/lib/quiz/answer-key";
import { sanitizeLessonHtml } from "@/lib/sanitize";
import { parseLessonContent } from "@/lib/content/lesson-content";
import { MAX_DRIP_DAYS, MAX_DURATION_SECONDS, MAX_PRACTICE_MINUTES, MIN_PRACTICE_MINUTES } from "@/lib/content/limits";
import { revalidateCourseContent } from "@/app/admin/courses/revalidate";
import { MAX_ANSWER_ROWS } from "./[lid]/QuestionForm";
import { deleteLessonCompletely, duplicateLessonCompletely } from "./lesson-ops";

const checkbox = z.preprocess((v) => v === "on" || v === true, z.boolean());
const blankToNull = (v: unknown) => (v === "" || v == null ? null : Number(v));
const DEFAULT_PASS_THRESHOLD = 70;

const MAX_BODY_CHARS = 200_000;
const Ids = z.object({ id: z.string().uuid(), course_id: z.string().min(1).max(100) });

// Lesson details + text, saved together by the editor's single Save button.
// Video and downloads save instantly from their own panels; order lives in the outline.
const LessonSchema = z.object({
  course_id: z.string().min(1).max(100),
  title: z.string().trim().min(2, "The title needs at least 2 characters.").max(200, "The title can be up to 200 characters."),
  description: z.string().max(2000, "The short description can be up to 2,000 characters.").optional(),
  kind: z.enum(["video", "quiz"], { message: "Choose a lesson type." }),
  duration_seconds: z.preprocess(
    blankToNull,
    z
      .number({ message: "Length must be a number of seconds." })
      .int("Length must be whole seconds.")
      .min(0, "Length can't be negative.")
      .max(MAX_DURATION_SECONDS, "Length can be at most 24 hours.")
      .nullable()
      .optional()
  ),
  available_after_days: z.preprocess(
    blankToNull,
    z
      .number({ message: "“Unlock after” must be a number of days." })
      .int("“Unlock after” must be whole days.")
      .min(0, "“Unlock after” can't be negative.")
      .max(MAX_DRIP_DAYS, `“Unlock after” can be at most ${MAX_DRIP_DAYS} days.`)
      .nullable()
      .optional()
  ),
  // Only quiz lessons show this field: absent leaves the stored value alone, blank means the default
  // (never 0%, which would pass every attempt).
  pass_threshold: z.preprocess(
    (v) => (v == null ? undefined : v === "" ? DEFAULT_PASS_THRESHOLD : Number(v)),
    z.number({ message: "Pass mark must be a number." }).int().min(0, "Pass mark: 0–100%.").max(100, "Pass mark: 0–100%.").optional()
  ),
  free_preview: checkbox,
  published: checkbox,
  module_id: z.preprocess((v) => (v === "" ? undefined : v), z.string().uuid().optional()),
  body_html: z.string().max(MAX_BODY_CHARS, "The lesson text is too long.").optional(),
  practice_minutes: z.preprocess(
    blankToNull,
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
  return `/admin/courses/${encodeURIComponent(courseId)}/lessons/${lessonId}?${new URLSearchParams(params).toString()}`;
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
  const ids = Ids.safeParse(Object.fromEntries(formData));
  if (!ids.success) redirect("/admin/courses");
  const { id, course_id: courseId } = ids.data;
  const parsed = LessonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(lessonUrl(courseId, id, { error: parsed.error.issues[0].message }));

  const { body_html: bodyHtml, ...fields } = parsed.data;
  const details = omitModule(fields);
  const content = parseLessonContent(formData);
  if (!content.ok) redirect(lessonUrl(courseId, id, { error: content.error }));
  const placement = await placementFor(id, parsed.data);
  if (placement === "invalid") redirect(lessonUrl(courseId, id, { error: "Choose a module from this course." }));

  const { data, error } = await createServiceClient()
    .from("lessons")
    .update({
      ...details,
      ...(placement ?? {}),
      ...(content.value ?? {}),
      ...(bodyHtml !== undefined ? { body_html: sanitizeLessonHtml(bodyHtml) || null } : {}),
    })
    .eq("id", id)
    .eq("course_id", courseId)
    .select("id");
  if (error) {
    console.error("updateLesson failed", { id, error: error.message });
    redirect(lessonUrl(courseId, id, { error: "Could not save the lesson. Please try again." }));
  }
  if (!data?.length) redirect(lessonUrl(courseId, id, { error: "This lesson no longer exists." }));
  revalidateCourseContent(courseId, id);
  redirect(lessonUrl(courseId, id, { saved: "1" }));
}

export async function deleteLesson(formData: FormData) {
  await requireAdmin();
  const ids = Ids.safeParse(Object.fromEntries(formData));
  if (!ids.success) redirect("/admin/courses");
  const { id, course_id: courseId } = ids.data;
  const res = await deleteLessonCompletely(createServiceClient(), courseId, id);
  if (!res.ok) redirect(lessonUrl(courseId, id, { error: res.error }));
  revalidateCourseContent(courseId);
  redirect(`/admin/courses/${encodeURIComponent(courseId)}?deleted=lesson`);
}

/** Lesson editor → Duplicate: a draft copy right below the original, then open it. */
export async function duplicateLesson(formData: FormData) {
  await requireAdmin();
  const ids = Ids.safeParse(Object.fromEntries(formData));
  if (!ids.success) redirect("/admin/courses");
  const { id, course_id: courseId } = ids.data;
  const res = await duplicateLessonCompletely(createServiceClient(), courseId, id);
  if (!res.ok) redirect(lessonUrl(courseId, id, { error: res.error }));
  revalidateCourseContent(courseId);
  redirect(lessonUrl(courseId, res.data.id, { saved: "duplicated" }));
}

// ── Quiz questions ─────────────────────────────────────────
const QuestionSchema = z.object({
  lesson_id: z.string().uuid(),
  course_id: z.string().min(1).max(100),
  position: z.coerce.number({ message: "Order must be a number." }).int("Order must be a whole number.").min(1, "Order starts at 1.").max(500),
  prompt: z.string().trim().min(2, "Write the question (at least 2 characters).").max(1000, "The question can be up to 1,000 characters."),
  kind: z.enum(["single", "multi", "tf"]),
  explanation: z.string().max(2000, "The explanation can be up to 2,000 characters.").optional(),
  tf_answer: z.enum(["true", "false", ""]).optional(),
});

async function quizLessonExists(courseId: string, lessonId: string): Promise<boolean> {
  const { data } = await createServiceClient().from("lessons").select("id").eq("id", lessonId).eq("course_id", courseId).maybeSingle();
  return Boolean(data);
}

export async function upsertQuestion(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id");
  const ids = z.object({ lesson_id: z.string().uuid(), course_id: z.string().min(1).max(100) }).safeParse(Object.fromEntries(formData));
  if (!ids.success) redirect("/admin/courses");
  const back = (params: Record<string, string>): never => redirect(lessonUrl(ids.data.course_id, ids.data.lesson_id, params));

  const parsed = QuestionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back({ error: parsed.error.issues[0].message });
  if (!(await quizLessonExists(parsed.data.course_id, parsed.data.lesson_id))) return back({ error: "Lesson not found." });

  const key = buildAnswerKey({
    kind: parsed.data.kind,
    options: Array.from({ length: MAX_ANSWER_ROWS }, (_, i) => String(formData.get(`option_${i}`) ?? "")),
    correct: formData.getAll("correct").map(Number).filter(Number.isInteger),
    tf: parsed.data.tf_answer === "true" ? true : parsed.data.tf_answer === "false" ? false : null,
  });
  if (!key.ok) return back({ error: key.error });

  const row = {
    lesson_id: parsed.data.lesson_id,
    position: parsed.data.position,
    prompt: parsed.data.prompt,
    kind: parsed.data.kind,
    options: key.options,
    correct: key.correct,
    explanation: parsed.data.explanation?.trim() || null,
  };
  const sb = createServiceClient();
  const { error } =
    typeof id === "string" && id
      ? await sb.from("quiz_questions").update(row).eq("id", id).eq("lesson_id", row.lesson_id)
      : await sb.from("quiz_questions").insert(row);
  if (error) {
    console.error("upsertQuestion failed", { lessonId: row.lesson_id, error: error.message });
    back({ error: error.code === "23505" ? "Another question already uses that order number." : "Could not save the question." });
  }
  revalidateCourseContent(parsed.data.course_id, parsed.data.lesson_id);
  back({ saved: "question" });
}

export async function deleteQuestion(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({ id: z.string().uuid(), lesson_id: z.string().uuid(), course_id: z.string().min(1).max(100) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/courses");
  const { id, lesson_id: lessonId, course_id: courseId } = parsed.data;
  if (!(await quizLessonExists(courseId, lessonId))) redirect(lessonUrl(courseId, lessonId, { error: "Lesson not found." }));

  const { error } = await createServiceClient().from("quiz_questions").delete().eq("id", id).eq("lesson_id", lessonId);
  if (error) {
    console.error("deleteQuestion failed", { id, lessonId, error: error.message });
    redirect(lessonUrl(courseId, lessonId, { error: "Could not delete the question." }));
  }
  revalidateCourseContent(courseId, lessonId);
  redirect(lessonUrl(courseId, lessonId, { saved: "question-deleted" }));
}
