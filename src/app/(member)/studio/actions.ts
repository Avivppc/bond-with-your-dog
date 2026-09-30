"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { notifyMemberByEmail } from "@/lib/feedback/notify-email";
import type { EmailOutcome } from "@/lib/feedback/email-outcome";

/** Roni's Studio writes. Every action checks the caller is staff, then uses the service role. */

export type StudioResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const id = z.string().uuid();
const NoteBody = z.string().trim().min(1, "Write the note first.").max(1000, "Keep notes under 1,000 characters.");

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function done(): void {
  revalidatePath("/studio");
}

async function staff() {
  const { user } = await requireStaff("content");
  return { user, sb: createServiceClient() };
}

const Pin = z.object({ videoId: id, atSeconds: z.number().min(0).max(24 * 3600), body: NoteBody });

export async function pinNote(input: z.input<typeof Pin>): Promise<StudioResult> {
  const { user, sb } = await staff();
  const parsed = Pin.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the note.");
  const { videoId, atSeconds, body } = parsed.data;
  const { error } = await sb.from("feedback_notes").insert({ video_id: videoId, at_seconds: Math.round(atSeconds * 10) / 10, body, author_id: user.id });
  if (error) {
    console.error("[studio] pin note failed", { videoId, error: error.message });
    return fail("The note didn't save. Please try again.");
  }
  done();
  return { ok: true, data: undefined };
}

const EditNote = z.object({ noteId: id, body: NoteBody });

export async function updateNote(input: z.input<typeof EditNote>): Promise<StudioResult> {
  const { sb } = await staff();
  const parsed = EditNote.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the note.");
  const { error } = await sb.from("feedback_notes").update({ body: parsed.data.body }).eq("id", parsed.data.noteId);
  if (error) {
    console.error("[studio] update note failed", { noteId: parsed.data.noteId, error: error.message });
    return fail("The note didn't save. Please try again.");
  }
  done();
  return { ok: true, data: undefined };
}

export async function deleteNote(noteId: string): Promise<StudioResult> {
  const { sb } = await staff();
  if (!id.safeParse(noteId).success) return fail("Unknown note.");
  const { error } = await sb.from("feedback_notes").delete().eq("id", noteId);
  if (error) {
    console.error("[studio] delete note failed", { noteId, error: error.message });
    return fail("The note wasn't removed. Please try again.");
  }
  done();
  return { ok: true, data: undefined };
}

const Level = z.object({ videoId: id, level: z.enum(["learning", "reliable", "performance"]) });

/** Roni's level for the video's move, on the member's dog (a coach level the member can't overwrite). */
export async function setCoachLevel(input: z.input<typeof Level>): Promise<StudioResult> {
  const { sb } = await staff();
  const parsed = Level.safeParse(input);
  if (!parsed.success) return fail("Choose a level.");
  const { data: video } = await sb.from("feedback_videos").select("dog_id, move_id").eq("id", parsed.data.videoId).maybeSingle();
  if (!video?.dog_id || !video.move_id) return fail("This video isn't linked to a dog and a move, so there's no level to set.");
  const { error } = await sb
    .from("dog_skills")
    .upsert(
      { dog_id: video.dog_id, move_id: video.move_id, level: parsed.data.level, set_by: "coach", updated_at: new Date().toISOString() },
      { onConflict: "dog_id,move_id" }
    );
  if (error) {
    console.error("[studio] set level failed", { videoId: parsed.data.videoId, error: error.message });
    return fail("The level didn't save. Please try again.");
  }
  done();
  return { ok: true, data: undefined };
}

const Send = z.object({ videoId: id, summary: z.string().trim().min(1, "Write a short summary first.").max(4000) });

/** Sends (or updates) Roni's feedback. The first send notifies the member in the app (DB trigger) and by email. */
export async function sendFeedback(input: z.input<typeof Send>): Promise<StudioResult<{ email: EmailOutcome | null; firstSend: boolean }>> {
  const { user, sb } = await staff();
  const parsed = Send.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the summary.");
  const { videoId, summary } = parsed.data;
  const { data: video } = await sb.from("feedback_videos").select("id, user_id, title, status").eq("id", videoId).maybeSingle();
  if (!video || (video.status !== "waiting" && video.status !== "replied")) return fail("This video isn't ready for feedback.");

  const firstSend = video.status === "waiting";
  const patch = firstSend ? { summary, status: "replied", reviewed_by: user.id, replied_at: new Date().toISOString() } : { summary };
  const { error } = await sb.from("feedback_videos").update(patch).eq("id", videoId);
  if (error) {
    console.error("[studio] send feedback failed", { videoId, error: error.message });
    return fail("The feedback didn't send. Please try again.");
  }
  const email = firstSend
    ? await notifyMemberByEmail(sb, video.user_id as string, {
        subject: `Roni replied to your ${video.title} video`,
        lead: `Roni watched your ${video.title} video and left you notes.`,
        path: `/feedback/${videoId}`,
      })
    : null;
  done();
  revalidatePath(`/feedback/${videoId}`);
  return { ok: true, data: { email, firstSend } };
}

const Reply = z.object({ videoId: id, body: z.string().trim().min(1, "Write your reply first.").max(2000) });

/** Roni's team answers the member under a video; the member gets a notification (and an email). */
export async function replyAsStaff(input: z.input<typeof Reply>): Promise<StudioResult<{ email: EmailOutcome }>> {
  const { user, sb } = await staff();
  const parsed = Reply.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Check the reply.");
  const { videoId, body } = parsed.data;
  const { data: video } = await sb.from("feedback_videos").select("user_id, title").eq("id", videoId).maybeSingle();
  if (!video) return fail("Video not found.");

  const { error } = await sb.from("feedback_messages").insert({ video_id: videoId, author_id: user.id, from_staff: true, body });
  if (error) {
    console.error("[studio] staff reply failed", { videoId, error: error.message });
    return fail("The reply didn't send. Please try again.");
  }
  const { error: notifyError } = await sb.from("notifications").insert({
    user_id: video.user_id,
    kind: "feedback",
    title: `Roni answered you about ${String(video.title).slice(0, 100)}`,
    body: body.slice(0, 200),
    href: `/feedback/${videoId}`,
  });
  if (notifyError) console.error("[studio] reply notification failed", { videoId, error: notifyError.message });
  const email = await notifyMemberByEmail(sb, video.user_id as string, {
    subject: `Roni answered you about ${video.title}`,
    lead: body,
    path: `/feedback/${videoId}`,
  });
  done();
  revalidatePath(`/feedback/${videoId}`);
  return { ok: true, data: { email } };
}
