"use client";

import { useId, useState, useTransition } from "react";
import { Ms } from "@/components/app/ui";
import { LocalTime } from "@/components/ui/LocalTime";
import { sendRoutineForFeedback } from "../actions";

/** "Send to Roni for feedback": the saved routine goes to Roni's inbox with an optional note. */
export function SendToRoni({ routineId, sentAt, blockedReason }: { routineId: string; sentAt: string | null; blockedReason: string | null }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const noteId = useId();

  function send() {
    setResult(null);
    start(async () => {
      const res = await sendRoutineForFeedback(routineId, note);
      if (res.ok) {
        setOpen(false);
        setNote("");
        setResult({ ok: true, text: "Sent. Roni's team will reply in Help and your notifications." });
      } else {
        setResult({ ok: false, text: res.error });
      }
    });
  }

  if (open) {
    return (
      <div className="stack" style={{ width: "min(420px, 100%)", gap: 8 }}>
        <label htmlFor={noteId} className="label">
          Anything Roni should look at? (optional)
        </label>
        <textarea id={noteId} className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} placeholder="e.g. Is the spin too close to the jump?" />
        <div className="row">
          <button type="button" className="btn btn-primary btn-sm" onClick={send} disabled={pending}>
            <Ms name="send" size="sm" />
            {pending ? "Sending…" : "Send to Roni"}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} disabled={pending}>
            Cancel
          </button>
        </div>
        {result && !result.ok && (
          <p className="faint" role="alert" style={{ color: "var(--danger)" }}>
            {result.text}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 4, alignItems: "flex-end" }}>
      <button type="button" className="link" onClick={() => setOpen(true)} disabled={Boolean(blockedReason)} title={blockedReason ?? undefined} style={blockedReason ? { opacity: 0.5, cursor: "not-allowed" } : undefined}>
        Send to Roni for feedback
        <Ms name="arrow_forward" />
      </button>
      <span className="faint" role="status">
        {result?.text ?? (blockedReason ? blockedReason : sentAt ? <>Last sent <LocalTime iso={sentAt} format="shortDate" /></> : null)}
      </span>
    </div>
  );
}
