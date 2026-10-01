import Link from "next/link";
import { Ms } from "@/components/app/ui";
import type { SessionSummary as Summary } from "@/lib/practice/session";

/** Shown after a session is saved: what was logged and where to go next. */
export function SessionSummary({
  summary,
  dogName,
  lessonHref,
  stopped,
  onAgain,
}: {
  summary: Summary;
  dogName: string;
  lessonHref: string;
  stopped: boolean;
  onAgain: () => void;
}) {
  const short = summary.durationSeconds < 60;
  const amount = short ? summary.durationSeconds : Math.round(summary.durationSeconds / 60);
  const unit = short ? (amount === 1 ? "Second" : "Seconds") : amount === 1 ? "Minute" : "Minutes";
  return (
    <div className="card state-card" role="status">
      <div className="big-ic" style={{ background: "var(--teal-soft)", color: "var(--teal)" }}>
        <Ms name="check" />
      </div>
      <span className="eyebrow muted">{stopped ? "Session saved early" : "Session saved"}</span>
      <h2 className="h2">Nice work, you and {dogName}</h2>
      <div className="row" style={{ gap: 28, justifyContent: "center" }}>
        <div className="stat">
          <b>{amount}</b>
          <span>{unit}</span>
        </div>
        <div className="stat">
          <b>{summary.reps}</b>
          <span>Reps</span>
        </div>
        <div className="stat">
          <b>{summary.stepsDone}</b>
          <span>{summary.stepsDone === 1 ? "Step done" : "Steps done"}</span>
        </div>
      </div>
      <p className="faint">It&apos;s on your weekly plan and counts toward {dogName}&apos;s progress.</p>
      <div className="row" style={{ justifyContent: "center" }}>
        <Link className="btn btn-primary" href="/plan">
          <Ms name="calendar_month" size="sm" />
          See your week
        </Link>
        <Link className="btn btn-ghost" href={lessonHref}>
          <Ms name="arrow_back" size="sm" />
          Back to the lesson
        </Link>
        <button type="button" className="link" onClick={onAgain}>
          Practice again
          <Ms name="replay" />
        </button>
      </div>
    </div>
  );
}
