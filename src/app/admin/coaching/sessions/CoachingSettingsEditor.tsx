"use client";

import { useState, useTransition } from "react";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL, MUTED, Notice } from "../../_components/ui";
import { coachingSettingsSchema, WEEKDAYS, type CoachingSettings, type WeeklyWindow } from "@/lib/coaching/schedule";
import { saveCoachingSettings } from "./actions";

const ZONES = ["Asia/Jerusalem", "Europe/London", "Europe/Berlin", "America/New_York", "America/Chicago", "America/Los_Angeles", "Australia/Sydney", "UTC"];

function NumberField({ label, value, onChange, min, max, hint }: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      <input type="number" min={min} max={max} value={Number.isFinite(value) ? value : ""} onChange={(e) => onChange(e.target.valueAsNumber)} className={INPUT} />
      {hint && <span className={`text-[12px] ${MUTED}`}>{hint}</span>}
    </label>
  );
}

/** Coaching setup: on/off, wording, length, price, Roni's weekly hours, notice and link. */
export function CoachingSettingsEditor({ initial }: { initial: CoachingSettings }) {
  const [s, setS] = useState<CoachingSettings>(initial);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof CoachingSettings>(key: K, value: CoachingSettings[K]) => setS((v) => ({ ...v, [key]: value }));
  const setWindow = (i: number, patch: Partial<WeeklyWindow>) => set("weekly", s.weekly.map((w, j) => (j === i ? { ...w, ...patch } : w)));
  const check = coachingSettingsSchema.safeParse(s);

  function save() {
    start(async () => {
      const res = await saveCoachingSettings(s);
      setStatus(res.ok ? { ok: true, text: s.enabled ? "Saved. Members can book from bonded.dog/coaching." : "Saved. Booking is off." } : { ok: false, text: res.error });
    });
  }

  return (
    <div className="space-y-5 rounded-[12px] border border-[#e7e6e4] bg-white p-5">
      <label className="flex items-center gap-3">
        <input type="checkbox" checked={s.enabled} onChange={(e) => set("enabled", e.target.checked)} className="h-5 w-5 accent-[#343332]" />
        <span>
          <span className="block font-semibold">Members can book sessions</span>
          <span className={`block text-[13px] ${MUTED}`}>Their page: bonded.dog/coaching</span>
        </span>
      </label>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Name</span>
          <input value={s.title} maxLength={80} onChange={(e) => set("title", e.target.value)} className={INPUT} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Meeting link (Zoom / Meet)</span>
          <input value={s.meeting_url ?? ""} placeholder="https://zoom.us/j/…" onChange={(e) => set("meeting_url", e.target.value.trim() || null)} className={INPUT} />
        </label>
        <label className="flex flex-col gap-1.5 md:col-span-2">
          <span className={LABEL}>Description</span>
          <textarea value={s.description ?? ""} maxLength={1000} rows={2} onChange={(e) => set("description", e.target.value || null)} className={INPUT} />
        </label>
        <NumberField label="Length (minutes)" value={s.duration_minutes} onChange={(n) => set("duration_minutes", n)} min={15} max={180} />
        <NumberField label="Break between sessions (minutes)" value={s.buffer_minutes} onChange={(n) => set("buffer_minutes", n)} min={0} max={120} />
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Price ({s.currency})</span>
          <input
            type="number"
            min={1}
            step="0.01"
            value={s.price_cents / 100}
            onChange={(e) => set("price_cents", Math.round(e.target.valueAsNumber * 100))}
            className={INPUT}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Roni&apos;s time zone</span>
          <select value={s.timezone} onChange={(e) => set("timezone", e.target.value)} className={INPUT}>
            {[...new Set([s.timezone, ...ZONES])].map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </label>
        <NumberField label="Book at least (hours ahead)" value={s.min_notice_hours} onChange={(n) => set("min_notice_hours", n)} min={0} max={336} />
        <NumberField label="Book up to (days ahead)" value={s.max_days_ahead} onChange={(n) => set("max_days_ahead", n)} min={1} max={180} />
        <NumberField
          label="Members can cancel up to (hours before)"
          value={s.cancel_hours}
          onChange={(n) => set("cancel_hours", n)}
          min={0}
          max={336}
          hint="Applies once a session is paid; unpaid ones can always be canceled."
        />
      </div>

      <fieldset className="space-y-3">
        <legend className={LABEL}>Weekly hours (in Roni&apos;s time zone)</legend>
        {s.weekly.length === 0 && <p className={`text-[13px] ${MUTED}`}>No hours yet. Add the times Roni is free each week.</p>}
        {s.weekly.map((w, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <select value={w.day} onChange={(e) => setWindow(i, { day: Number(e.target.value) })} className={`${INPUT} w-40`} aria-label="Day">
              {WEEKDAYS.map((d, n) => (
                <option key={d} value={n}>
                  {d}
                </option>
              ))}
            </select>
            <input type="time" value={w.start} onChange={(e) => setWindow(i, { start: e.target.value })} className={`${INPUT} w-32`} aria-label="From" />
            <span className={MUTED}>to</span>
            <input type="time" value={w.end} onChange={(e) => setWindow(i, { end: e.target.value })} className={`${INPUT} w-32`} aria-label="Until" />
            <button type="button" onClick={() => set("weekly", s.weekly.filter((_, j) => j !== i))} className="text-[14px] text-red-700 hover:underline">
              Remove
            </button>
          </div>
        ))}
        <button type="button" className={BTN_SECONDARY} onClick={() => set("weekly", [...s.weekly, { day: 1, start: "09:00", end: "12:00" }])}>
          Add hours
        </button>
      </fieldset>

      {!check.success && <p className="text-[14px] text-[#b42318]">{check.error.issues[0]?.message}</p>}
      {status && <Notice tone={status.ok ? "success" : "error"}>{status.text}</Notice>}
      <button type="button" className={BTN_PRIMARY} onClick={save} disabled={pending || !check.success}>
        {pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
