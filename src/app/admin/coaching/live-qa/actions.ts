"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { meetupReturnUrl } from "@/app/admin/community/meetup-schema";

const Answered = z.object({
  id: z.string().uuid(),
  meetup_id: z.string().uuid(),
  answered: z.enum(["true", "false"]),
});

/** Marks a question a member sent ahead as answered (or back to open). */
export async function setQaQuestionAnswered(formData: FormData): Promise<void> {
  await requireStaff("content");
  const parsed = Answered.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(meetupReturnUrl("live-qa", { error: "Invalid request." }));
  const { id, meetup_id: meetupId, answered } = parsed.data;
  const { error } = await createServiceClient()
    .from("qa_questions")
    .update({ answered: answered === "true" })
    .eq("id", id)
    .eq("meetup_id", meetupId);
  if (error) {
    console.error("[admin/coaching] qa question update failed", { id, error: error.message });
    redirect(meetupReturnUrl("live-qa", { error: "Could not update the question." }, meetupId));
  }
  revalidatePath("/admin/coaching/live-qa");
  redirect(meetupReturnUrl("live-qa", {}, meetupId));
}
