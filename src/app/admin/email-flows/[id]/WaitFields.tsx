"use client";

import type { WaitNode } from "@/lib/flows/graph";
import { WEEKDAY_LABEL } from "@/lib/flows/local-time";
import { INPUT, LABEL, MUTED } from "../../_components/ui";

const num = (value: string, fallback: number) => (Number.isFinite(Number(value)) && value !== "" ? Math.round(Number(value)) : fallback);

/** A wait step: a duration, or until a time of day (and weekday) in each person's own time zone. */
export function WaitFields({ data, onData }: { data: WaitNode["data"]; onData: (d: WaitNode["data"]) => void }) {
  const until = data.mode === "until";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 text-[14px]">
        <label className="flex items-center gap-2">
          <input type="radio" name="wait-mode" className="h-4 w-4 accent-[#343332]" checked={!until} onChange={() => onData({ days: data.days || 2, hours: data.hours, mode: "duration" })} />
          For a while
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="wait-mode" className="h-4 w-4 accent-[#343332]" checked={until} onChange={() => onData({ ...data, mode: "until", atHour: data.atHour ?? 10, weekday: data.weekday ?? null })} />
          Until a time of day, in each person&apos;s time zone
        </label>
      </div>
      {until ? (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Time</span>
            <select className={INPUT} value={data.atHour ?? 10} onChange={(e) => onData({ ...data, atHour: num(e.target.value, 10) })}>
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Day</span>
            <select className={INPUT} value={data.weekday ?? ""} onChange={(e) => onData({ ...data, weekday: e.target.value === "" ? null : num(e.target.value, 0) })}>
              <option value="">The next one</option>
              {WEEKDAY_LABEL.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <p className={`col-span-2 text-[12px] ${MUTED}`}>Members&apos; time zone comes from their settings; quiz leads and anyone without one use UTC.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Days</span>
            <input className={INPUT} type="number" min={0} max={60} value={data.days} onChange={(e) => onData({ ...data, days: num(e.target.value, 0) })} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Hours</span>
            <input className={INPUT} type="number" min={0} max={23} value={data.hours} onChange={(e) => onData({ ...data, hours: num(e.target.value, 0) })} />
          </label>
          <p className={`col-span-2 text-[12px] ${MUTED}`}>The flow checks every 15 minutes, so waits land within 15 minutes of this time.</p>
        </div>
      )}
    </div>
  );
}
