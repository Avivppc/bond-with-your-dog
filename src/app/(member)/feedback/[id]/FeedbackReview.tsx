"use client";

import { useRef, useState } from "react";
import { currentNoteId, formatClock, sortNotes, type TimedNote } from "@/lib/feedback/format";
import { NotedPlayer, type PlayerHandle } from "../_components/NotedPlayer";

/**
 * Feedback view: the player and Roni's notes stay in step — clicking a note (or its marker)
 * seeks the video, and the note being played is highlighted.
 */
export function FeedbackReview({
  playbackId,
  duration,
  title,
  notes,
  summary,
  aside,
}: {
  playbackId: string | null;
  duration: number | null;
  title: string;
  notes: TimedNote[];
  summary: React.ReactNode;
  aside: React.ReactNode;
}) {
  const player = useRef<PlayerHandle>(null);
  const [time, setTime] = useState(0);
  const sorted = sortNotes(notes);
  const current = currentNoteId(sorted, time);

  return (
    <div className="grid-main">
      <div className="stack-lg">
        <NotedPlayer handleRef={player} playbackId={playbackId} fallbackDuration={duration} notes={sorted} title={title} onTime={setTime} />
        {summary}
      </div>
      <div className="stack-lg sticky">
        {sorted.length > 0 && (
          <div className="card tight">
            <span className="eyebrow muted">Notes on your video</span>
            <div className="stack" style={{ gap: 4 }}>
              {sorted.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`comment ${n.id === current ? "on" : ""}`}
                  aria-current={n.id === current ? "true" : undefined}
                  onClick={() => player.current?.seek(n.at_seconds)}
                >
                  <span className="ts">{formatClock(n.at_seconds)}</span>
                  <span>{n.body}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {aside}
      </div>
    </div>
  );
}
