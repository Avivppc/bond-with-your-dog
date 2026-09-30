"use client";

import { useId, useState, useTransition } from "react";
import { Ms } from "@/components/app/ui";
import { WEEKDAY_SHORT } from "@/lib/practice/dates";
import { updatePracticePrefs } from "./actions";

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const LENGTHS = [5, 10, 15] as const;

function summary(days: readonly number[], minutes: number): string {
  if (days.length === 0) return `No regular practice days · ${minutes} min sessions`;
  return `${WEEK_ORDER.filter((d) => days.includes(d)).map((d) => WEEKDAY_SHORT[d]).join(", ")} · ${minutes} min sessions`;
}

/** The member's default rhythm (profiles.practice_days × session_minutes), editable in place. */
export function PracticePrefs({ days, minutes }: { days: number[]; minutes: 5 | 10 | 15 }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<number[]>(days);
  const [length, setLength] = useState<5 | 10 | 15>(minutes);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ids = { days: useId(), length: useId() };

  function toggle(d: number) {
    setPicked(picked.includes(d) ? picked.filter((x) => x !== d) : [...picked, d]);
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await updatePracticePrefs({ practiceDays: picked, sessionMinutes: length });
      if (res.ok) setOpen(false);
      else setError(res.error);
    });
  }

  if (!open) {
    return (
      <div className="row faint">
        <Ms name="event_repeat" size="sm" />
        <span>Your rhythm: {summary(days, minutes)}</span>
        <button type="button" className="link" onClick={() => setOpen(true)}>
          Change
          <Ms name="edit" />
        </button>
      </div>
    );
  }

  return (
    <div className="card tight" style={{ width: "100%" }}>
      <div className="field">
        <span className="label" id={ids.days}>
          Practice days
        </span>
        <div className="row" role="group" aria-labelledby={ids.days} style={{ gap: 8 }}>
          {WEEK_ORDER.map((d) => (
            <button key={d} type="button" className={`chip ${picked.includes(d) ? "on" : ""}`} aria-pressed={picked.includes(d)} onClick={() => toggle(d)}>
              {WEEKDAY_SHORT[d]}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label" id={ids.length}>
          Session length
        </span>
        <div className="seg" role="radiogroup" aria-labelledby={ids.length}>
          {LENGTHS.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={length === m} className={length === m ? "on" : ""} onClick={() => setLength(m)}>
              {m} min
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p className="faint" role="alert" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <div className="row">
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={pending}>
          <Ms name="check" size="sm" />
          {pending ? "Saving…" : "Save my rhythm"}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setPicked(days);
            setLength(minutes);
            setOpen(false);
          }}
          disabled={pending}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
