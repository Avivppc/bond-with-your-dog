import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import type { SkillLevel } from "@/lib/member/viewer";
import { settleUploads, type UploadingRow } from "./upload-server";
import { hasUnansweredMessage, UNNAMED_MEMBER, videosAwaitingReply, type FeedbackStatus, type VideoMessage } from "./status";

/** Roni's Studio data. Callers must have passed requireStaff() first (service role, no RLS). */

type Service = ReturnType<typeof createServiceClient>;

export type StudioTab = "waiting" | "done";

export interface QueueVideo {
  id: string;
  user_id: string;
  dog_id: string | null;
  move_id: string | null;
  title: string;
  note: string | null;
  status: FeedbackStatus;
  summary: string | null;
  created_at: string;
  replied_at: string | null;
  duration_seconds: number | null;
  mux_playback_id: string | null;
  memberName: string;
  dogName: string | null;
  dogPhoto: string | null;
  moveName: string | null;
  needsReply: boolean;
}

export interface StudioStats {
  waiting: number;
  /** Replied videos the member wrote back on, waiting for Roni's answer. */
  replies: number;
  stories: number;
  questions: number;
}

interface Row extends Omit<QueueVideo, "memberName" | "dogName" | "dogPhoto" | "moveName" | "needsReply"> {
  dogs: { name: string; photo_url: string | null } | null;
  moves: { name: string } | null;
}

const COLUMNS =
  "id, user_id, dog_id, move_id, title, note, status, summary, created_at, replied_at, duration_seconds, mux_playback_id, dogs(name, photo_url), moves(name)";
const DONE_LIMIT = 50;
const REPLY_SCAN_LIMIT = 500;

function count(res: { count: number | null; error: { message: string } | null }, what: string): number {
  if (res.error) console.error(`[studio] ${what} count failed`, res.error.message);
  return res.count ?? 0;
}

/**
 * Replied videos where the member wrote back after Roni, oldest wait first. Only the newest
 * messages are scanned (bounded); a video whose last word is older than that is long settled.
 */
export async function loadAwaitingReplyIds(sb: Service): Promise<string[]> {
  const { data, error } = await sb
    .from("feedback_messages")
    .select("video_id, from_staff, created_at")
    .order("created_at", { ascending: false })
    .limit(REPLY_SCAN_LIMIT)
    .returns<VideoMessage[]>();
  if (error) console.error("[studio] recent messages load failed", error.message);
  return videosAwaitingReply(data ?? []);
}

export async function loadStudioStats(sb: Service): Promise<StudioStats> {
  const [waiting, stories, questions, awaitingIds] = await Promise.all([
    sb.from("feedback_videos").select("id", { count: "exact", head: true }).eq("status", "waiting"),
    sb.from("support_requests").select("id", { count: "exact", head: true }).eq("kind", "story").eq("status", "open"),
    sb.from("qa_questions").select("id", { count: "exact", head: true }).eq("answered", false),
    loadAwaitingReplyIds(sb),
  ]);
  const replies = awaitingIds.length
    ? count(await sb.from("feedback_videos").select("id", { count: "exact", head: true }).eq("status", "replied").in("id", awaitingIds), "replies")
    : 0;
  return { waiting: count(waiting, "waiting"), replies, stories: count(stories, "stories"), questions: count(questions, "questions") };
}

/** Uploads still "processing" are checked with Mux here too, so nothing waits unseen. */
export async function settleStaleUploads(sb: Service): Promise<void> {
  const { data, error } = await sb
    .from("feedback_videos")
    .select("id, status, mux_upload_id, mux_asset_id, created_at")
    .eq("status", "uploading")
    .order("created_at")
    .limit(8)
    .returns<UploadingRow[]>();
  if (error) console.error("[studio] uploading lookup failed", error.message);
  await settleUploads(data ?? []);
}

async function memberNames(sb: Service, userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await sb.from("profiles").select("id, full_name").in("id", userIds);
  if (error) console.error("[studio] profiles load failed", error.message);
  return new Map((data ?? []).map((p) => [p.id as string, ((p.full_name as string | null) ?? "").trim() || UNNAMED_MEMBER]));
}

async function unansweredVideos(sb: Service, videoIds: string[]): Promise<Set<string>> {
  if (videoIds.length === 0) return new Set();
  const { data, error } = await sb.from("feedback_messages").select("video_id, from_staff, created_at").in("video_id", videoIds);
  if (error) console.error("[studio] messages load failed", error.message);
  const byVideo = new Map<string, { from_staff: boolean; created_at: string }[]>();
  for (const m of data ?? []) byVideo.set(m.video_id as string, [...(byVideo.get(m.video_id as string) ?? []), m as { from_staff: boolean; created_at: string }]);
  return new Set([...byVideo].filter(([, msgs]) => hasUnansweredMessage(msgs)).map(([id]) => id));
}

async function selectRows(query: PromiseLike<{ data: Row[] | null; error: { message: string } | null }>, what: string): Promise<Row[]> {
  const { data, error } = await query;
  if (error) console.error(`[studio] ${what} load failed`, error.message);
  return data ?? [];
}

/** Waiting = new videos (oldest first), then replied videos the member wrote back on (oldest message first). */
async function waitingRows(sb: Service): Promise<Row[]> {
  const [fresh, awaitingIds] = await Promise.all([
    selectRows(sb.from("feedback_videos").select(COLUMNS).eq("status", "waiting").order("created_at").returns<Row[]>(), "queue"),
    loadAwaitingReplyIds(sb),
  ]);
  if (awaitingIds.length === 0) return fresh;
  const replied = await selectRows(sb.from("feedback_videos").select(COLUMNS).eq("status", "replied").in("id", awaitingIds).returns<Row[]>(), "follow-ups");
  const byId = new Map(replied.map((r) => [r.id, r]));
  return [...fresh, ...awaitingIds.flatMap((id) => byId.get(id) ?? [])];
}

export async function loadQueue(sb: Service, tab: StudioTab): Promise<QueueVideo[]> {
  const rows =
    tab === "waiting"
      ? await waitingRows(sb)
      : await selectRows(sb.from("feedback_videos").select(COLUMNS).eq("status", "replied").order("replied_at", { ascending: false }).limit(DONE_LIMIT).returns<Row[]>(), "queue");
  const [names, unanswered] = await Promise.all([
    memberNames(sb, [...new Set(rows.map((r) => r.user_id))]),
    unansweredVideos(sb, rows.map((r) => r.id)),
  ]);
  return rows.map(({ dogs, moves, ...r }) => ({
    ...r,
    duration_seconds: r.duration_seconds === null ? null : Number(r.duration_seconds),
    memberName: names.get(r.user_id) ?? UNNAMED_MEMBER,
    dogName: dogs?.name ?? null,
    dogPhoto: dogs?.photo_url ?? null,
    moveName: moves?.name ?? null,
    needsReply: unanswered.has(r.id),
  }));
}

export interface ReviewDetail {
  notes: { id: string; at_seconds: number; body: string }[];
  messages: { id: string; body: string; from_staff: boolean; created_at: string }[];
  level: SkillLevel | null;
}

export async function loadReviewDetail(sb: Service, video: QueueVideo): Promise<ReviewDetail> {
  const [notesRes, messagesRes, skillRes] = await Promise.all([
    sb.from("feedback_notes").select("id, at_seconds, body").eq("video_id", video.id).order("at_seconds"),
    sb.from("feedback_messages").select("id, body, from_staff, created_at").eq("video_id", video.id).order("created_at"),
    video.dog_id && video.move_id
      ? sb.from("dog_skills").select("level").eq("dog_id", video.dog_id).eq("move_id", video.move_id).maybeSingle()
      : null,
  ]);
  if (notesRes.error) console.error("[studio] notes load failed", notesRes.error.message);
  if (messagesRes.error) console.error("[studio] messages load failed", messagesRes.error.message);
  return {
    notes: (notesRes.data ?? []).map((n) => ({ id: n.id as string, at_seconds: Number(n.at_seconds), body: n.body as string })),
    messages: (messagesRes.data ?? []) as ReviewDetail["messages"],
    level: (skillRes?.data?.level as SkillLevel | undefined) ?? null,
  };
}
