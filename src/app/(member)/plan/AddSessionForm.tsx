"use client";

import { useId, useState, useTransition } from "react";
import { Ms } from "@/components/app/ui";
import { addPlannedSession } from "./actions";

export interface DayOption {
  value: string;
  label: string;
}

export interface LessonOption {
  id: string;
  label: string;
}

const MINUTES = [5, 10, 15, 20] as const;

/** "Add a session": pick a day, a length and (optionally) the lesson to practise. */
export function AddSessionForm({ dogId, days, lessons, defaultMinutes }: { dogId: string; days: DayOption[]; lessons: LessonOption[]; defaultMinutes: number }) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(days[0]?.value ?? "");
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [lessonId, setLessonId] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const ids = { day: useId(), lesson: useId(), minutes: useId() };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const res = await addPlannedSession({ plannedOn: day, minutes, lessonId: lessonId || null, dogId });
      if (!res.ok) {
        setMessage({ ok: false, text: res.error });
        return;
      }
      const label = days.find((d) => d.value === day)?.label ?? day;
      setMessage({ ok: true, text: `Session added to ${label}.` });
      setOpen(false);
    });
  }

  return (
    <div className="stack" style={{ alignItems: "flex-end" }}>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(!open)} aria-expanded={open}>
        <Ms name={open ? "close" : "add"} size="sm" />
        {open ? "Close" : "Add a session"}
      </button>
      <p className="faint" role="status" aria-live="polite" style={message && !message.ok ? { color: "var(--danger)" } : undefined}>
        {message?.text}
      </p>
      {open && (
        <form className="card tight" onSubmit={submit} style={{ width: "min(420px, 100%)" }} aria-label="Add a session">
          <div className="field">
            <label htmlFor={ids.day}>Day</label>
            <select id={ids.day} className="input" value={day} onChange={(e) => setDay(e.target.value)}>
              {days.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <span className="label" id={ids.minutes}>
              Length
            </span>
            <div className="seg" role="radiogroup" aria-labelledby={ids.minutes}>
              {MINUTES.map((m) => (
                <button key={m} type="button" role="radio" aria-checked={minutes === m} className={minutes === m ? "on" : ""} onClick={() => setMinutes(m)}>
                  {m} min
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <label htmlFor={ids.lesson}>Lesson to practise</label>
            <select id={ids.lesson} className="input" value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
              <option value="">Free practice (no lesson)</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={pending || !day}>
            <Ms name="check" size="sm" />
            {pending ? "Adding…" : "Add to my week"}
          </button>
        </form>
      )}
    </div>
  );
}
