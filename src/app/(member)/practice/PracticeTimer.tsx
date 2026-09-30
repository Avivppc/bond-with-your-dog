"use client";

import { Ms } from "@/components/app/ui";
import { arcOffset, formatClock } from "@/lib/practice/session";
import { useCountdown } from "./useCountdown";

const RADIUS = 88;
const CIRCUMFERENCE = Math.round(2 * Math.PI * RADIUS);
const STATUS_LABEL = { ready: "Ready", running: "Running", paused: "Paused", done: "Done" } as const;

/** The design's timer ring: counts down the step's time; start / pause / reset. */
export function PracticeTimer({ seconds, stepKey, onFirstStart }: { seconds: number; stepKey: number; onFirstStart: () => void }) {
  const { left, status, start, pause, reset } = useCountdown(seconds, stepKey);
  const running = status === "running";

  function toggle() {
    if (running) {
      pause();
      return;
    }
    onFirstStart();
    start();
  }

  return (
    <div className="stack" style={{ alignItems: "center" }}>
      <div className="timer">
        <svg width="200" height="200" viewBox="0 0 200 200" aria-hidden>
          <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="var(--tint-2)" strokeWidth="10" />
          <circle
            cx="100"
            cy="100"
            r={RADIUS}
            fill="none"
            stroke="var(--orange)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={arcOffset(left, seconds, CIRCUMFERENCE)}
            transform="rotate(-90 100 100)"
          />
        </svg>
        <b role="timer" aria-label={`${formatClock(left)} left`}>
          {formatClock(left)}
        </b>
        <small aria-live="polite">{status === "done" ? "Time's up" : STATUS_LABEL[status]}</small>
      </div>
      <div className="row" style={{ justifyContent: "center" }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={toggle}>
          <Ms name={running ? "pause" : "play_arrow"} size="sm" />
          {running ? "Pause" : status === "paused" ? "Resume" : status === "done" ? "Start again" : "Start timer"}
        </button>
        {status !== "ready" && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={reset} aria-label="Reset the timer">
            <Ms name="restart_alt" size="sm" />
            Reset
          </button>
        )}
      </div>
    </div>
  );
}
