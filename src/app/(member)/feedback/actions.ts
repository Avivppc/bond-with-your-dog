"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const Reply = z.object({
  videoId: z.string().uuid(),
  body: z.string().trim().min(1, "Write your reply first.").max(2000, "Please keep it under 2,000 characters."),
});

/** The member answers Roni under a video (the DB checks it's their video). */
export async function replyToFeedback(input: z.input<typeof Reply>): Promise<ActionResult> {
  const parsed = Reply.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your reply." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("reply_to_feedback", { p_video_id: parsed.data.videoId, p_body: parsed.data.body });
  if (error) {
    console.error("[feedback] reply failed", { videoId: parsed.data.videoId, error: error.message });
    return { ok: false, error: error.code === "42501" ? "This video isn't on your account." : "Your reply didn't send. Please try again." };
  }
  revalidatePath(`/feedback/${parsed.data.videoId}`);
  revalidatePath("/studio");
  return { ok: true };
}
