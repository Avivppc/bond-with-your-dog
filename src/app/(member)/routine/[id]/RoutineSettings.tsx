"use client";

import { useId, useState, useTransition } from "react";
import { Ms } from "@/components/app/ui";
import { deleteRoutine, renameRoutine } from "../actions";

/** Rename or delete the routine. */
export function RoutineSettings({ id, name }: { id: string; name: string }) {
  const [value, setValue] = useState(name);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const inputId = useId();

  function rename(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    start(async () => {
      const res = await renameRoutine(id, value);
      setMessage(res.ok ? { ok: true, text: "Name saved." } : { ok: false, text: res.error });
    });
  }

  return (
    <div className="card tight">
      <span className="eyebrow muted">Routine settings</span>
      <form className="row" onSubmit={rename} style={{ alignItems: "flex-end" }}>
        <div className="field" style={{ flex: 1, minWidth: 200 }}>
          <label htmlFor={inputId}>Name</label>
          <input id={inputId} className="input" value={value} onChange={(e) => setValue(e.target.value)} maxLength={80} required />
        </div>
        <button type="submit" className="btn btn-ghost btn-sm" disabled={pending || value.trim() === name || !value.trim()}>
          Rename
        </button>
      </form>
      {message && (
        <p className="faint" role={message.ok ? "status" : "alert"} style={message.ok ? undefined : { color: "var(--danger)" }}>
          {message.text}
        </p>
      )}
      {confirming ? (
        <form action={deleteRoutine.bind(null, id)} className="row">
          <span className="faint">Delete this routine and its music for good?</span>
          <button type="submit" className="btn btn-danger btn-sm">
            Yes, delete
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
            Keep it
          </button>
        </form>
      ) : (
        <button type="button" className="link" style={{ color: "var(--danger)", alignSelf: "flex-start" }} onClick={() => setConfirming(true)}>
          <Ms name="delete" />
          Delete routine
        </button>
      )}
    </div>
  );
}
