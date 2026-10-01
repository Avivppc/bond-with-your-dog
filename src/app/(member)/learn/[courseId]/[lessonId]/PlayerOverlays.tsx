"use client";

import Link from "next/link";
import { Ms } from "@/components/app/ui";
import { formatClock } from "@/lib/feedback/format";

/** The lesson image under a dark veil: shown while the video loads, or with a message instead of it. */
export function PlayerPoster({ src, loading = false, children }: { src: string | null; loading?: boolean; children?: React.ReactNode }) {
  return (
    <div className="player-poster" aria-busy={loading || undefined}>
      {/* eslint-disable-next-line @next/next/no-img-element -- lesson artwork */}
      {src && <img src={src} alt="" />}
      <div className="player-poster-msg">
        {loading ? <span className="player-spinner" role="status" aria-label="Loading the video" /> : children}
      </div>
    </div>
  );
}

/** "Picking up at 2:31 · Start over": says where the video resumed and offers the beginning. */
export function ResumeNotice({ at, onStartOver, onDismiss }: { at: number; onStartOver: () => void; onDismiss: () => void }) {
  return (
    <div className="player-note" role="status">
      <Ms name="history" size="sm" />
      <span>Picking up at {formatClock(at)}</span>
      <button type="button" onClick={onStartOver}>
        Start over
      </button>
      <button type="button" className="player-note-x" onClick={onDismiss} aria-label="Hide this message">
        <Ms name="close" size="sm" />
      </button>
    </div>
  );
}

interface EndCardProps {
  next: { href: string; title: string } | null;
  doneHref: string;
  practiceHref: string;
  onReplay: () => void;
}

/** Shown when the video ends: the lesson counts as done, and the obvious next steps are one tap away. */
export function EndCard({ next, doneHref, practiceHref, onReplay }: EndCardProps) {
  return (
    <div className="end-card" role="dialog" aria-label="Lesson finished">
      <div className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
        <span className="state-ic done" aria-hidden>
          <Ms name="check" size="sm" />
        </span>
        <b>Lesson complete</b>
      </div>
      <p>{next ? <>Up next: {next.title}</> : "That was the last lesson of this chapter."}</p>
      <div className="row" style={{ gap: 8, justifyContent: "center" }}>
        <Link className="btn btn-primary btn-sm" href={next?.href ?? doneHref}>
          {next ? "Next lesson" : "Continue"}
          <Ms name="arrow_forward" size="sm" />
        </Link>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onReplay}>
          <Ms name="replay" size="sm" />
          Watch again
        </button>
        <Link className="btn btn-ghost btn-sm end-card-extra" href={practiceHref}>
          <Ms name="pets" size="sm" />
          Practice it
        </Link>
      </div>
    </div>
  );
}
