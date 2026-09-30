"use client";

import { useState, useTransition } from "react";
import { setNewsletter, setNotifPref } from "./actions";

/**
 * One settings row with the design's switch (role="switch"). Saves right away; on failure the
 * switch flips back and says why.
 */
export function SwitchRow({ prefKey, label, hint, initial }: { prefKey: string; label: string; hint: string; initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle() {
    const next = !on;
    setOn(next);
    setError(null);
    start(async () => {
      const res = prefKey === "newsletter" ? await setNewsletter(next) : await setNotifPref({ key: prefKey, value: next });
      if (!res.ok) {
        setOn(!next);
        setError(res.error);
      }
    });
  }

  const id = `pref-${prefKey}`;
  return (
    <div className="set-row">
      <div className="grow">
        <b id={id}>{label}</b>
        <div className="faint">{error ? <span style={{ color: "var(--danger)" }}>{error}</span> : hint}</div>
      </div>
      <button type="button" className="switch" role="switch" aria-checked={on} aria-labelledby={id} aria-busy={pending} onClick={toggle} />
    </div>
  );
}
