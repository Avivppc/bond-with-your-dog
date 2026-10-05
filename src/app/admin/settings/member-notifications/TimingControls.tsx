"use client";

import { INPUT, MUTED } from "../../_components/ui";
import type { NotificationSettings, Topic } from "@/lib/notification-settings/topics";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const SELECT = `${INPUT} w-auto py-1.5`;

export function hourLabel(h: number): string {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function HourSelect({ value, onChange, label }: { value: number; onChange: (h: number) => void; label: string }) {
  return (
    <select className={SELECT} aria-label={label} value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {HOURS.map((h) => (
        <option key={h} value={h}>
          {hourLabel(h)}
        </option>
      ))}
    </select>
  );
}

/** "When" for the timed notifications; hours are each member's local time. */
export function TimingControls({ topic, settings, onChange }: { topic: Topic; settings: NotificationSettings; onChange: (next: NotificationSettings) => void }) {
  const row = "flex flex-wrap items-center gap-2 text-[13px] text-[#1a1a19]";

  if (topic === "practice") {
    const p = settings.practice;
    return (
      <div className="flex flex-col gap-1 rounded-[10px] bg-[#fafaf9] p-3">
        <div className={row}>
          Send
          <select className={SELECT} aria-label="Which day" value={p.when} onChange={(e) => onChange({ ...settings, practice: { ...p, when: e.target.value as "day_of" | "day_before" } })}>
            <option value="day_of">on the practice day</option>
            <option value="day_before">the evening before</option>
          </select>
          from
          <HourSelect label="From what time" value={p.hour} onChange={(hour) => onChange({ ...settings, practice: { ...p, hour } })} />
        </div>
        <span className={`text-[12px] ${MUTED}`}>Each member&apos;s own time. Only on their practice days, and only if they haven&apos;t practiced yet.</span>
      </div>
    );
  }

  if (topic === "lesson_unlocked") {
    return (
      <div className="flex flex-col gap-1 rounded-[10px] bg-[#fafaf9] p-3">
        <div className={row}>
          Announce from
          <HourSelect label="From what time" value={settings.lessonUnlocked.hour} onChange={(hour) => onChange({ ...settings, lessonUnlocked: { hour } })} />
          in the member&apos;s time
        </div>
      </div>
    );
  }

  if (topic === "live_session") {
    const l = settings.liveSession;
    const set = (patch: Partial<NotificationSettings["liveSession"]>) => onChange({ ...settings, liveSession: { ...l, ...patch } });
    return (
      <div className="flex flex-col gap-2 rounded-[10px] bg-[#fafaf9] p-3">
        <label className={row}>
          <input type="checkbox" className="h-4 w-4 accent-[#343332]" checked={l.dayBefore} onChange={(e) => set({ dayBefore: e.target.checked })} />
          The day before, from
          <HourSelect label="Day before, from what time" value={l.dayBeforeHour} onChange={(dayBeforeHour) => set({ dayBeforeHour })} />
        </label>
        <label className={row}>
          <input type="checkbox" className="h-4 w-4 accent-[#343332]" checked={l.dayOf} onChange={(e) => set({ dayOf: e.target.checked })} />
          On the day,
          <select className={SELECT} aria-label="Hours before" value={l.hoursBefore} onChange={(e) => set({ hoursBefore: Number(e.target.value) })}>
            {[1, 2, 3, 4, 6, 8, 12].map((h) => (
              <option key={h} value={h}>
                {h} {h === 1 ? "hour" : "hours"}
              </option>
            ))}
          </select>
          before it starts
        </label>
      </div>
    );
  }

  if (topic === "feedback_overdue") {
    return (
      <div className="flex flex-col gap-1 rounded-[10px] bg-[#fafaf9] p-3">
        <label className={row}>
          After
          <input
            type="number"
            min={1}
            max={30}
            className={`${INPUT} w-20 py-1.5`}
            value={settings.feedbackOverdue.days}
            onChange={(e) => onChange({ ...settings, feedbackOverdue: { days: Math.min(30, Math.max(1, Math.round(Number(e.target.value) || 1))) } })}
          />
          days without feedback
        </label>
      </div>
    );
  }

  return null;
}
