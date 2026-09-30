"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { QUESTION_TABS } from "./tabs";

/** Coaching → Lesson questions: answer (the DB trigger notifies the member), edit, hide / unhide. */
export type AnswerResult = { ok: true } | { ok: false; error: string };

const Answer = z.object({
  id: z.string().uuid(),
  answer: z.string().trim().min(1, "Write an answer first.").max(4000, "Answers can be up to 4,000 characters."),
});

async function lessonPathOf(lessonId: string): Promise<string | null> {
  const { data } = await createServiceClient().from("lessons").select("course_id").eq("id", lessonId).maybeSingle();
  return data ? `/learn/${data.course_id}/${lessonId}` : null;
}

export async function answerQuestion(input: z.input<typeof Answer>): Promise<AnswerResult> {
  const { user } = await requireStaff("content");
  const parsed = Answer.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, answer } = parsed.data;

  const sb = createServiceClient();
  const { data: current, error: loadError } = await sb.from("lesson_questions").select("answered_at, lesson_id").eq("id", id).maybeSingle();
  if (loadError) console.error("[admin/coaching] question load failed", { id, error: loadError.message });
  if (!current) return { ok: false, error: "This question no longer exists." };

  // Editing keeps the original answer time; the first answer stamps it (and the trigger notifies).
  const { error } = await sb
    .from("lesson_questions")
    .update({ answer, answered_by: user.id, answered_at: current.answered_at ?? new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("[admin/coaching] answer failed", { id, error: error.message });
    return { ok: false, error: "Could not save the answer." };
  }
  revalidatePath("/admin/coaching/questions");
  const lessonPath = await lessonPathOf(current.lesson_id as string);
  if (lessonPath) revalidatePath(lessonPath);
  return { ok: true };
}

const Visibility = z.object({
  id: z.string().uuid(),
  hidden: z.enum(["true", "false"]),
  tab: z.enum(QUESTION_TABS),
  page: z.coerce.number().int().min(1).max(10_000),
});

export async function setQuestionHidden(formData: FormData): Promise<void> {
  await requireStaff("content");
  const parsed = Visibility.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/coaching/questions?error=" + encodeURIComponent("Invalid request."));
  const { id, hidden, tab, page } = parsed.data;
  function back(params: Record<string, string>): never {
    redirect(`/admin/coaching/questions?${new URLSearchParams({ tab, page: String(page), ...params }).toString()}`);
  }

  const sb = createServiceClient();
  const { data, error } = await sb.from("lesson_questions").update({ hidden: hidden === "true" }).eq("id", id).select("lesson_id").maybeSingle();
  if (error || !data) {
    console.error("[admin/coaching] hide failed", { id, error: error?.message });
    back({ error: "Could not update the question." });
  }
  revalidatePath("/admin/coaching/questions");
  const lessonPath = await lessonPathOf(data.lesson_id as string);
  if (lessonPath) revalidatePath(lessonPath);
  back({ notice: hidden === "true" ? "hidden" : "shown" });
}
