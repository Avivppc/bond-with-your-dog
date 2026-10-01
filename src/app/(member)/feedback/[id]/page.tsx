import { notFound } from "next/navigation";
import { z } from "zod";
import { requireMember } from "@/lib/member/viewer";
import { createClient } from "@/lib/supabase/server";
import { Breadcrumbs } from "@/components/app/ui";
import type { SkillLevel } from "@/lib/member/viewer";
import type { FeedbackStatus } from "@/lib/feedback/status";
import { splitSummary } from "@/lib/feedback/format";
import { Conversation, type ConversationMessage } from "../_components/Conversation";
import { FeedbackReview } from "./FeedbackReview";
import { ReplyBox } from "./ReplyBox";

export const metadata = { title: "Roni's feedback" };

type Supabase = Awaited<ReturnType<typeof createClient>>;

interface VideoRow {
  id: string;
  title: string;
  note: string | null;
  status: FeedbackStatus;
  summary: string | null;
  member_read_at: string | null;
  duration_seconds: number | null;
  mux_playback_id: string | null;
  dog_id: string | null;
  move_id: string | null;
  lesson_id: string | null;
  moves: { name: string; lesson_id: string | null } | null;
  dogs: { name: string } | null;
}

const LEVEL_TONE: Record<SkillLevel, string> = { learning: "learning", reliable: "reliable", performance: "perform" };
const LEVEL_LABEL: Record<SkillLevel, string> = { learning: "Learning", reliable: "Reliable", performance: "Performance-ready" };

const VIDEO_COLUMNS =
  "id, title, note, status, summary, member_read_at, duration_seconds, mux_playback_id, dog_id, move_id, lesson_id, moves(name, lesson_id), dogs(name)";

/** Opening Roni's reply marks it read, and clears the matching notification. */
async function markRead(supabase: Supabase, video: VideoRow): Promise<void> {
  if (video.status !== "replied") return;
  const [readRes, notifRes] = await Promise.all([
    video.member_read_at ? null : supabase.rpc("mark_feedback_read", { p_video_id: video.id }),
    supabase.from("notifications").select("id").eq("href", `/feedback/${video.id}`).is("read_at", null),
  ]);
  if (readRes?.error) console.error("[feedback] mark read failed", readRes.error.message);
  const ids = (notifRes.data ?? []).map((n) => n.id as string);
  if (ids.length === 0) return;
  const { error } = await supabase.rpc("mark_notifications_read", { p_ids: ids });
  if (error) console.error("[feedback] clearing notifications failed", error.message);
}

async function coachLevel(supabase: Supabase, video: VideoRow): Promise<SkillLevel | null> {
  if (!video.dog_id || !video.move_id) return null;
  const { data } = await supabase
    .from("dog_skills")
    .select("level")
    .eq("dog_id", video.dog_id)
    .eq("move_id", video.move_id)
    .eq("set_by", "coach")
    .maybeSingle();
  return (data?.level as SkillLevel | undefined) ?? null;
}

export default async function FeedbackViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireMember(`/feedback/${id}`);
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await createClient();
  const { data: video } = await supabase.from("feedback_videos").select(VIDEO_COLUMNS).eq("id", id).maybeSingle<VideoRow>();
  if (!video) notFound();

  const [notesRes, messagesRes, level] = await Promise.all([
    supabase.from("feedback_notes").select("id, at_seconds, body").eq("video_id", id).order("at_seconds"),
    supabase.from("feedback_messages").select("id, body, from_staff, created_at").eq("video_id", id).order("created_at"),
    coachLevel(supabase, video),
    markRead(supabase, video),
  ]);
  const notes = (notesRes.data ?? []).map((n) => ({ id: n.id as string, at_seconds: Number(n.at_seconds), body: n.body as string }));
  const messages = (messagesRes.data ?? []) as ConversationMessage[];
  const lessonId = video.lesson_id ?? video.moves?.lesson_id ?? null;
  const practiceHref = lessonId ? `/practice?lesson=${lessonId}` : "/practice";
  const dogName = video.dogs?.name ?? viewer.activeDog?.name ?? "your dog";
  const { headline, rest } = splitSummary(video.summary);

  const summary =
    video.status === "replied" ? (
      <div className="card" style={{ background: "var(--card)" }}>
        <div className="row">
          {/* eslint-disable-next-line @next/next/no-img-element -- design avatar */}
          <img className="avatar lg" src="/app/img/roni.jpg" alt="Roni Sagi" />
          <div>
            <span className="eyebrow">Roni&apos;s summary</span>
            <h2 className="h3">{headline || "Here's what I saw"}</h2>
          </div>
        </div>
        {rest && (
          <p className="muted" style={{ whiteSpace: "pre-wrap" }}>
            {rest}
          </p>
        )}
        {level && video.moves && (
          <div className="row">
            <span className={`pill ${LEVEL_TONE[level]}`}>
              {video.moves.name} → {LEVEL_LABEL[level]}
            </span>
          </div>
        )}
      </div>
    ) : (
      <div className="card">
        <span className="eyebrow">In review</span>
        <h2 className="h3">Roni hasn&apos;t replied yet</h2>
        <p className="muted">
          {video.note ? `You asked: "${video.note}". ` : ""}We&apos;ll notify you as soon as her notes on {dogName}&apos;s video are ready.
        </p>
      </div>
    );

  const aside = (
    <>
      {messages.length > 0 && (
        <div className="card tight">
          <span className="eyebrow muted">Conversation</span>
          <Conversation messages={messages} />
        </div>
      )}
      <ReplyBox videoId={video.id} practiceHref={practiceHref} placeholder={`Thank you! Should ${dogName} also try it off-leash?`} />
    </>
  );

  return (
    <>
      <Breadcrumbs items={[{ href: "/feedback", label: "Your videos" }, { label: video.title }]} />
      <FeedbackReview playbackId={video.mux_playback_id} duration={video.duration_seconds} title={video.title} notes={notes} summary={summary} aside={aside} />
    </>
  );
}
