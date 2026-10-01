"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { setTimeZone } from "./actions";

const subscribe = () => () => {};
const deviceZoneSnapshot = () => Intl.DateTimeFormat().resolvedOptions().timeZone || null;

/**
 * The zone reminders use. Saves on change; on failure the picker goes back and says why.
 * Until a zone is saved we show the device's zone (that's what the app records on its own).
 */
export function TimeZoneRow({ initial, options }: { initial: string | null; options: string[] }) {
  const deviceZone = useSyncExternalStore(subscribe, deviceZoneSnapshot, () => null);
  const [chosen, setChosen] = useState<string | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const zone = chosen ?? deviceZone ?? "UTC";
  const list = options.includes(zone) ? options : [zone, ...options];

  function change(next: string) {
    const previous = chosen;
    setChosen(next);
    setError(null);
    setSaved(false);
    start(async () => {
      const res = await setTimeZone(next);
      if (!res.ok) {
        setChosen(previous);
        setError(res.error);
        return;
      }
      setSaved(true);
    });
  }

  let hint: React.ReactNode = "Reminders arrive on your practice days in this time zone.";
  if (error) hint = <span style={{ color: "var(--danger)" }}>{error}</span>;
  else if (saved) hint = "Saved. Reminders follow this time zone.";
  else if (deviceZone && zone !== deviceZone) hint = `This device is set to ${deviceZone.replace(/_/g, " ")}.`;

  return (
    <div className="set-row">
      <div className="grow">
        <label htmlFor="pref-timezone">
          <b>Time zone</b>
        </label>
        <div className="faint">{hint}</div>
        <select id="pref-timezone" className="input" style={{ marginTop: 8 }} value={zone} disabled={pending} onChange={(e) => change(e.target.value)}>
          {list.map((z) => (
            <option key={z} value={z}>
              {z.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
