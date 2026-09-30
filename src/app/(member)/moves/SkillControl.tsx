"use client";

import { useId, useState, useTransition } from "react";
import type { SkillLevel } from "@/lib/member/viewer";
import { setMoveLevel } from "./actions";

type MemberLevel = "learning" | "reliable" | null;
const OPTIONS: { value: MemberLevel; label: string }[] = [
  { value: null, label: "Not started" },
  { value: "learning", label: "Learning" },
  { value: "reliable", label: "Reliable" },
];

/** The member marks the dog's level on a move (up to Reliable; Performance-ready is Roni's call). */
export function SkillControl({ dogId, dogName, moveId, level }: { dogId: string; dogName: string; moveId: string; level: SkillLevel | null }) {
  const [current, setCurrent] = useState<MemberLevel>(level === "performance" ? "reliable" : level);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const labelId = useId();

  function choose(value: MemberLevel) {
    if (value === current || pending) return;
    const previous = current;
    setCurrent(value);
    setError(null);
    start(async () => {
      const res = await setMoveLevel({ dogId, moveId, level: value });
      if (!res.ok) {
        setCurrent(previous);
        setError(res.error);
      }
    });
  }

  return (
    <div className="field">
      <span className="label" id={labelId}>
        {dogName}&apos;s level
      </span>
      <div className="seg" role="radiogroup" aria-labelledby={labelId} aria-busy={pending}>
        {OPTIONS.map((o) => (
          <button key={o.label} type="button" role="radio" aria-checked={current === o.value} className={current === o.value ? "on" : ""} onClick={() => choose(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
      {error && (
        <p className="faint" role="alert" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}
