"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, ok, type ActionResult } from "@/lib/member/result";
import { EVENTS } from "@/lib/analytics-events";
import { trackSignedIn } from "@/lib/analytics-member";

const MESSAGES: Record<string, string> = {
  "42501": "The Q&A is for community members.",
  "22023": "That Q&A isn't taking questions any more.",
  "54000": "You've sent the most questions allowed for this session.",
};

const Question = z.object({ meetupId: z.string().uuid(), body: z.string().trim().min(5, "Write a little more.").max(1000) });

/** A question sent ahead of a Live Q&A (Roni answers it live). */
export async function sendQaQuestion(input: z.input<typeof Question>): Promise<ActionResult> {
  const parsed = Question.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check your question.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("send_qa_question", { p_meetup_id: parsed.data.meetupId, p_body: parsed.data.body });
  if (error) {
    console.error("[community] qa question failed", { meetupId: parsed.data.meetupId, error: error.message });
    return fail(MESSAGES[error.code ?? ""] ?? "Could not send your question. Please try again.");
  }
  trackSignedIn(EVENTS.qaQuestionSubmitted, { meetup_id: parsed.data.meetupId });
  revalidatePath("/community");
  return ok(undefined);
}

const Story = z.object({
  title: z.string().trim().max(200).optional(),
  body: z.string().trim().min(20, "Tell us a little more — a few sentences is perfect.").max(5000),
  consentPublic: z.boolean(),
});

/** "Share how you changed": goes to Roni's inbox; published on the site only with consent. */
export async function shareStory(input: z.input<typeof Story>): Promise<ActionResult> {
  const parsed = Story.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Please check your story.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_support_request", {
    p_kind: "story",
    p_subject: parsed.data.title ?? null,
    p_body: parsed.data.body,
    p_page_url: "/community",
    p_consent_public: parsed.data.consentPublic,
  });
  if (error) {
    console.error("[community] story failed", { error: error.message });
    return fail(error.code === "54000" ? "Too many messages today — try again tomorrow." : "Could not send your story. Please try again.");
  }
  trackSignedIn(EVENTS.storySubmitted, { consent_public: parsed.data.consentPublic });
  return ok(undefined);
}
