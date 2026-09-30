"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/member/result";

const Ask = z.object({ lessonId: z.string().uuid(), courseId: z.string().min(1).max(100), body: z.string().trim().min(3, "Write a little more.").max(2000) });

const MESSAGES: Record<string, string> = {
  "42501": "You need access to this lesson to ask about it.",
  "54000": "That's a lot of questions for one day — try again tomorrow.",
};

/** A question on a lesson's "Questions" tab (Roni's team answers from the admin). */
export async function askLessonQuestion(input: z.input<typeof Ask>): Promise<ActionResult> {
  const parsed = Ask.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check your question.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("ask_lesson_question", { p_lesson_id: parsed.data.lessonId, p_body: parsed.data.body });
  if (error) {
    console.error("[questions] ask failed", { lessonId: parsed.data.lessonId, error: error.message });
    return fail(MESSAGES[error.code ?? ""] ?? "Could not send your question. Please try again.");
  }
  revalidatePath(`/learn/${parsed.data.courseId}/${parsed.data.lessonId}`);
  return ok(undefined);
}
