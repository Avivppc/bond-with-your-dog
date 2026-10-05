"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ms } from "@/components/app/ui";
import { bookSession } from "./actions";

interface BookingPickerProps {
  /** Open times as ISO instants (the page computed them from Roni's hours). */
  slots: readonly string[];
  priceLabel: string;
  durationMinutes: number;
}

const dayKey = (iso: string) => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const dayLabel = (iso: string) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date(iso));
const timeLabel = (iso: string) => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(iso));

/** Day → time → what to work on → book. Times show in the member's own time zone. */
export function BookingPicker({ slots, priceLabel, durationMinutes }: BookingPickerProps) {
  const router = useRouter();
  const days = useMemo(() => {
    const grouped = new Map<string, string[]>();
    for (const s of slots) grouped.set(dayKey(s), [...(grouped.get(dayKey(s)) ?? []), s]);
    return [...grouped.entries()];
  }, [slots]);
  const [day, setDay] = useState(days[0]?.[0] ?? null);
  const [time, setTime] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Times are shown in the browser's time zone, which the server doesn't know: render after load.
  const [zone, setZone] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setZone(Intl.DateTimeFormat().resolvedOptions().timeZone), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!zone) return <p className="faint">Loading open times…</p>;
  if (days.length === 0) {
    return <p className="muted">No open times in the coming weeks. Check back soon, or ask us from Help.</p>;
  }
  // After a refresh the chosen day may have no times left: fall back to the first open day.
  const activeDay = days.some(([d]) => d === day) ? day : days[0][0];
  const times = days.find(([d]) => d === activeDay)?.[1] ?? [];

  function book() {
    if (!time) return;
    setError(null);
    start(async () => {
      const res = await bookSession({ startsAt: time, topic });
      if (!res.ok) {
        setError(res.error);
        router.refresh();
        return;
      }
      setTime(null);
      setTopic("");
      router.refresh();
    });
  }

  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }} role="group" aria-label="Day">
        {days.map(([d, list]) => (
          <button key={d} type="button" className={`btn btn-sm ${d === activeDay ? "btn-primary" : "btn-ghost"}`} onClick={() => (setDay(d), setTime(null))}>
            {dayLabel(list[0])}
          </button>
        ))}
      </div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }} role="group" aria-label="Time">
        {times.map((t) => (
          <button key={t} type="button" className={`btn btn-sm ${t === time ? "btn-primary" : "btn-ghost"}`} onClick={() => setTime(t)} aria-pressed={t === time}>
            {timeLabel(t)}
          </button>
        ))}
      </div>
      <span className="faint">
        Times are in your time zone ({zone}). Each session is {durationMinutes} minutes.
      </span>
      {time && (
        <>
          <label className="label" htmlFor="coachingTopic">
            What would you like to work on? (optional)
          </label>
          <textarea
            id="coachingTopic"
            className="input"
            style={{ minHeight: 90 }}
            maxLength={1000}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Your dog, what you've tried, and what you'd like Roni to look at."
          />
          {error && (
            <span role="alert" style={{ color: "var(--danger)" }}>
              {error}
            </span>
          )}
          <button type="button" className="btn btn-primary" onClick={book} disabled={pending} style={{ alignSelf: "flex-start" }}>
            <Ms name="event_available" size="sm" />
            {pending ? "Booking…" : `Book ${dayLabel(time)}, ${timeLabel(time)} · ${priceLabel}`}
          </button>
        </>
      )}
    </div>
  );
}
