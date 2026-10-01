"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/admin";
import { COMMUNITY_MEDIA_BUCKET } from "@/lib/community/queries";
import { communityImagePath, validateCommunityImage } from "@/lib/community/media";
import { EVENTS } from "@/lib/analytics-events";
import { trackSignedIn } from "@/lib/analytics-member";

/** Community actions for members (via the DB RPCs, as the member) and staff moderation. */
export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const uuid = z.string().uuid();
const MESSAGES: Record<string, string> = {
  "42501": "You can't do that here.",
  "22023": "That didn't work — please check and try again.",
  "28000": "Please sign in again.",
};

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function refresh(): void {
  revalidatePath("/community", "layout");
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<ActionResult<T>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    console.error(`[community] ${fn} failed`, error.message);
    return fail(MESSAGES[error.code ?? ""] ?? "Something went wrong. Please try again.");
  }
  refresh();
  return { ok: true, data: data as T };
}

// ── Media ───────────────────────────────────────────────────
const Upload = z.object({ fileName: z.string().min(1).max(255), size: z.number().int().nonnegative(), contentType: z.string().max(100) });

/** Signed upload URL for a post image, in the member's own folder. */
export async function startCommunityUpload(input: z.input<typeof Upload>): Promise<ActionResult<{ path: string; token: string }>> {
  const parsed = Upload.safeParse(input);
  if (!parsed.success) return fail("Invalid upload.");
  const invalid = validateCommunityImage({ name: parsed.data.fileName, size: parsed.data.size, type: parsed.data.contentType });
  if (invalid) return fail(invalid);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: member } = await supabase.rpc("can_access_community");
  if (!user || !member) return fail("Join the community to share images.");

  const path = communityImagePath(user.id, parsed.data.fileName, randomUUID());
  const { data, error } = await createServiceClient().storage.from(COMMUNITY_MEDIA_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error("[community] upload url failed", error?.message);
    return fail("Could not start the upload.");
  }
  return { ok: true, data: { path: data.path, token: data.token } };
}

// ── Posts ───────────────────────────────────────────────────
const CreatePost = z.object({
  channelId: uuid.nullable(),
  challengeId: uuid.nullable(),
  title: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1, "Write something first.").max(20000),
  imagePath: z.string().max(300).nullable(),
  pollOptions: z.array(z.string().trim().min(1).max(100)).min(2).max(6).nullable(),
});

export async function createPost(input: z.input<typeof CreatePost>): Promise<ActionResult<{ id: string }>> {
  const parsed = CreatePost.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const p = parsed.data;
  const res = await rpc<string>("community_create_post", {
    p_channel_id: p.channelId,
    p_challenge_id: p.challengeId,
    p_title: p.title ?? null,
    p_body: p.body,
    p_image_path: p.imagePath,
    p_poll_options: p.pollOptions,
  });
  if (res.ok) {
    trackSignedIn(EVENTS.communityPostCreated, {
      channel_id: p.channelId,
      challenge_id: p.challengeId,
      has_image: Boolean(p.imagePath),
      has_poll: Boolean(p.pollOptions),
    }, { dedupeKey: res.data });
  }
  return res.ok ? { ok: true, data: { id: res.data } } : res;
}

const UpdatePost = z.object({ postId: uuid, title: z.string().trim().max(200).optional(), body: z.string().trim().min(1).max(20000) });

export async function updatePost(input: z.input<typeof UpdatePost>): Promise<ActionResult> {
  const parsed = UpdatePost.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const res = await rpc<null>("community_update_post", { p_post_id: parsed.data.postId, p_title: parsed.data.title ?? null, p_body: parsed.data.body });
  return res.ok ? { ok: true, data: undefined } : res;
}

export async function deletePost(postId: string): Promise<ActionResult> {
  if (!uuid.safeParse(postId).success) return fail("Invalid post.");
  const res = await rpc<null>("community_delete_post", { p_post_id: postId });
  return res.ok ? { ok: true, data: undefined } : res;
}

export async function reportPost(postId: string, reason: string): Promise<ActionResult> {
  if (!uuid.safeParse(postId).success) return fail("Invalid post.");
  const res = await rpc<null>("community_report_post", { p_post_id: postId, p_reason: reason.slice(0, 500) });
  return res.ok ? { ok: true, data: undefined } : res;
}

export async function toggleLike(target: { postId?: string; commentId?: string }): Promise<ActionResult<{ liked: boolean }>> {
  const postId = target.postId && uuid.safeParse(target.postId).success ? target.postId : null;
  const commentId = target.commentId && uuid.safeParse(target.commentId).success ? target.commentId : null;
  if (!postId === !commentId) return fail("Invalid like.");
  const res = await rpc<boolean>("community_toggle_like", { p_post_id: postId, p_comment_id: commentId });
  return res.ok ? { ok: true, data: { liked: res.data } } : res;
}

export async function vote(postId: string, option: number): Promise<ActionResult> {
  if (!uuid.safeParse(postId).success || !Number.isInteger(option)) return fail("Invalid vote.");
  const res = await rpc<null>("community_vote", { p_post_id: postId, p_option: option });
  return res.ok ? { ok: true, data: undefined } : res;
}

// ── Comments ────────────────────────────────────────────────
const AddComment = z.object({ postId: uuid, parentId: uuid.nullable(), body: z.string().trim().min(1, "Write a comment first.").max(5000) });

export async function addComment(input: z.input<typeof AddComment>): Promise<ActionResult<{ id: string }>> {
  const parsed = AddComment.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const res = await rpc<string>("community_add_comment", { p_post_id: parsed.data.postId, p_parent_id: parsed.data.parentId, p_body: parsed.data.body });
  if (res.ok) {
    trackSignedIn(EVENTS.communityCommentCreated, { post_id: parsed.data.postId, is_reply: parsed.data.parentId !== null }, { dedupeKey: res.data });
  }
  return res.ok ? { ok: true, data: { id: res.data } } : res;
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  if (!uuid.safeParse(commentId).success) return fail("Invalid comment.");
  const res = await rpc<null>("community_delete_comment", { p_comment_id: commentId });
  return res.ok ? { ok: true, data: undefined } : res;
}

// ── Challenges & meetups ────────────────────────────────────
export async function joinChallenge(challengeId: string): Promise<ActionResult> {
  if (!uuid.safeParse(challengeId).success) return fail("Invalid challenge.");
  const res = await rpc<null>("community_join_challenge", { p_challenge_id: challengeId });
  if (res.ok) trackSignedIn(EVENTS.challengeJoined, { challenge_id: challengeId });
  return res.ok ? { ok: true, data: undefined } : res;
}

export async function completeStep(stepId: string, done: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(stepId).success) return fail("Invalid step.");
  const res = await rpc<null>("community_complete_step", { p_step_id: stepId, p_done: done });
  return res.ok ? { ok: true, data: undefined } : res;
}

export async function rsvp(meetupId: string, going: boolean): Promise<ActionResult> {
  if (!uuid.safeParse(meetupId).success) return fail("Invalid meetup.");
  const res = await rpc<null>("community_rsvp", { p_meetup_id: meetupId, p_going: going });
  if (res.ok) trackSignedIn(EVENTS.meetupRsvped, { meetup_id: meetupId, going });
  return res.ok ? { ok: true, data: undefined } : res;
}

// ── Staff moderation (service role after the staff check) ───
const Moderate = z.object({
  postId: uuid,
  action: z.enum(["pin", "unpin", "lock", "unlock", "approve", "remove", "dismiss_reports", "publish_now"]),
});

export async function moderatePost(input: z.input<typeof Moderate>): Promise<ActionResult> {
  await requireStaff("content");
  const parsed = Moderate.safeParse(input);
  if (!parsed.success) return fail("Invalid request.");
  const { postId, action } = parsed.data;
  const now = new Date().toISOString();
  const changes: Record<string, unknown> = {
    pin: { pinned: true },
    unpin: { pinned: false },
    lock: { comments_locked: true },
    unlock: { comments_locked: false },
    approve: { status: "published", publish_at: now },
    remove: { status: "removed", pinned: false },
    dismiss_reports: { report_count: 0 },
    publish_now: { status: "published", publish_at: now },
  }[action];
  const sb = createServiceClient();
  const { error } = await sb.from("community_posts").update({ ...(changes as object), updated_at: now }).eq("id", postId);
  if (!error && action === "dismiss_reports") await sb.from("community_reports").delete().eq("post_id", postId);
  if (error) {
    console.error("[community] moderation failed", { postId, action, error: error.message });
    return fail("Could not update the post.");
  }
  refresh();
  return { ok: true, data: undefined };
}

const Schedule = z.object({
  channelId: uuid,
  title: z.string().trim().max(200).optional(),
  body: z.string().trim().min(1, "Write something first.").max(20000),
  publishAt: z.string().datetime({ offset: true }),
});

/** Staff: a post that goes live at a set time (Kajabi "Scheduled posts"). */
export async function schedulePost(input: z.input<typeof Schedule>): Promise<ActionResult> {
  const { user } = await requireStaff("content");
  const parsed = Schedule.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  if (new Date(parsed.data.publishAt).getTime() <= Date.now()) return fail("Pick a time in the future.");
  const { error } = await createServiceClient()
    .from("community_posts")
    .insert({
      channel_id: parsed.data.channelId,
      author_id: user.id,
      title: parsed.data.title || null,
      body: parsed.data.body,
      status: "scheduled",
      publish_at: parsed.data.publishAt,
    });
  if (error) {
    console.error("[community] schedule failed", error.message);
    return fail("Could not schedule the post.");
  }
  refresh();
  return { ok: true, data: undefined };
}
