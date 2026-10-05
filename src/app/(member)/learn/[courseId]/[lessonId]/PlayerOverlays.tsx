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
  /** False when the member skipped ahead: the lesson isn't done until most of the video was watched. */
  completed: boolean;
  next: { href: string; title: string } | null;
  doneHref: string;
  practiceHref: string;
  onReplay: () => void;
}

/** Shown when the video ends: whether the lesson counts as done, and the obvious next steps one tap away. */
export function EndCard({ completed, next, doneHref, practiceHref, onReplay }: EndCardProps) {
  return (
    <div className="end-card" role="dialog" aria-label={completed ? "Lesson finished" : "Video ended"}>
      <div className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
        <span className={completed ? "state-ic done" : "state-ic"} aria-hidden>
          <Ms name={completed ? "check" : "play_arrow"} size="sm" />
        </span>
        <b>{completed ? "Lesson complete" : "Not complete yet"}</b>
      </div>
      <p>
        {!completed
          ? "Parts of the video were skipped. Watch it through to complete this lesson."
          : next
            ? <>Up next: {next.title}</>
            : "That was the last lesson of this chapter."}
      </p>
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
