import Link from "next/link";
import { ageLabel, isOverdue } from "@/lib/feedback/status";
import type { QueueVideo, StudioTab } from "@/lib/feedback/studio";

const COLUMNS = "minmax(0,1.4fr) minmax(0,1fr) 90px 110px";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function StatusPill({ video, now }: { video: QueueVideo; now: Date }) {
  if (video.status === "replied") {
    return video.needsReply ? <span className="pill learning">New message</span> : <span className="pill reliable">Replied</span>;
  }
  return isOverdue(video.created_at, now) ? <span className="pill danger">Overdue</span> : <span className="pill learning">New</span>;
}

/** Review queue rows (design: .queue-row); each opens the video in the panel via ?id=. */
export function StudioQueue({ videos, tab, selectedId, now }: { videos: QueueVideo[]; tab: StudioTab; selectedId: string | null; now: Date }) {
  if (videos.length === 0) {
    return (
      <p className="faint" style={{ padding: "8px 16px" }}>
        {tab === "waiting" ? "No videos waiting. New ones appear here as members send them." : "Nothing sent back yet."}
      </p>
    );
  }
  return (
    <>
      <div className="queue-head" style={{ display: "grid", gridTemplateColumns: COLUMNS, gap: 14 }}>
        <span>Member</span>
        <span>Move</span>
        <span>Sent</span>
        <span>Status</span>
      </div>
      <div className="stack" style={{ gap: 2 }}>
        {videos.map((v) => {
          const who = v.dogName ? `${v.memberName.split(/\s+/)[0]} & ${v.dogName}` : v.memberName;
          const href = `/studio?${new URLSearchParams({ ...(tab === "done" ? { q: "done" } : {}), id: v.id })}`;
          return (
            <Link key={v.id} href={href} scroll={false} className={`queue-row ${v.id === selectedId ? "on" : ""}`} aria-current={v.id === selectedId ? "true" : undefined}>
              <span className="who">
                {v.dogPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element -- member's dog photo
                  <img src={v.dogPhoto} alt="" />
                ) : (
                  <span className="avatar-initials" aria-hidden style={{ width: 36, height: 36, fontSize: 13 }}>
                    {initials(v.dogName ?? v.memberName)}
                  </span>
                )}
                <b>{who}</b>
              </span>
              <span className="hide-sm">{v.moveName ?? v.title}</span>
              <span className="faint hide-sm">{ageLabel(v.created_at, now)}</span>
              <StatusPill video={v} now={now} />
            </Link>
          );
        })}
      </div>
    </>
  );
}
