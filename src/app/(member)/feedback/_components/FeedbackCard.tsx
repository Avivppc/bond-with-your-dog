import Link from "next/link";
import { formatClock, muxThumbnailUrl, plural } from "@/lib/feedback/format";
import { feedbackPill, type FeedbackStatus } from "@/lib/feedback/status";

export interface FeedbackCardVideo {
  id: string;
  title: string;
  note: string | null;
  status: FeedbackStatus;
  summary: string | null;
  member_read_at: string | null;
  duration_seconds: number | null;
  mux_playback_id: string | null;
  notes: number;
}

function firstSentence(text: string): string {
  const match = text.match(/^.+?[.!?](\s|$)/);
  return (match ? match[0] : text).trim();
}

function Detail({ video }: { video: FeedbackCardVideo }) {
  if (video.status === "replied") {
    const text = video.member_read_at && video.summary ? `"${firstSentence(video.summary)}"` : `Roni left ${plural(video.notes, "note")} and a summary`;
    return (
      <div className="row">
        {/* eslint-disable-next-line @next/next/no-img-element -- design avatar */}
        <img className="avatar" src="/app/img/roni.jpg" alt="" style={{ width: 26, height: 26 }} />
        <span className="faint">{text}</span>
      </div>
    );
  }
  if (video.status === "waiting") return <span className="faint">Roni will reply here. We&apos;ll notify you.</span>;
  if (video.status === "uploading") return <span className="faint">Getting your video ready for Roni…</span>;
  return <span className="faint">This upload didn&apos;t finish. Please send the clip again.</span>;
}

/** One row in "Your videos" (design: .sub-card). Replied and waiting videos open the feedback view. */
export function FeedbackCard({ video, sent }: { video: FeedbackCardVideo; sent: React.ReactNode }) {
  const pill = feedbackPill(video);
  const meta = [video.duration_seconds ? formatClock(video.duration_seconds) : null, video.note ? `"${video.note}"` : null].filter(Boolean);
  const body = (
    <>
      <div className="media">
        {video.mux_playback_id ? (
          // eslint-disable-next-line @next/next/no-img-element -- Mux still frame
          <img src={muxThumbnailUrl(video.mux_playback_id)} alt="" />
        ) : null}
        <span className="ms fill" aria-hidden>
          {video.status === "errored" ? "error" : video.status === "uploading" ? "hourglass_top" : "play_arrow"}
        </span>
      </div>
      <div className="stack" style={{ gap: 6, minWidth: 0 }}>
        <b className="h3">{video.title}</b>
        <span className="faint" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          Sent {sent}
          {meta.length > 0 && ` · ${meta.join(" · ")}`}
        </span>
        <Detail video={video} />
      </div>
      <span className={`pill ${pill.tone}`} style={{ justifySelf: "start" }}>
        {pill.label}
      </span>
    </>
  );
  const opens = video.status === "replied" || video.status === "waiting";
  return opens ? (
    <Link className="sub-card" href={`/feedback/${video.id}`}>
      {body}
    </Link>
  ) : (
    <div className="sub-card">{body}</div>
  );
}
