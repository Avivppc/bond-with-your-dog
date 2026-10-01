"use client";

import { useState, useTransition } from "react";
import { Ms } from "@/components/app/ui";
import { deleteAccount } from "./actions";

/** Your data: download everything now, or delete the account after typing DELETE. */
export function DataCard() {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function remove() {
    setError(null);
    start(async () => {
      const res = await deleteAccount(typed);
      // On success the action redirects away; we only get here with an error.
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="card">
      <h2 className="h3">Your data</h2>
      <div className="set-row">
        <div className="grow">
          <b>Download my data</b>
          <div className="faint">Profile, dogs, progress, practice, your videos&apos; feedback and orders, as a file</div>
        </div>
        <a className="btn btn-ghost btn-sm" href="/api/me/export" download>
          Download
        </a>
      </div>
      <div className="set-row">
        <div className="grow">
          <b style={{ color: "var(--danger)" }}>Delete account</b>
          <div className="faint">Removes your progress and videos permanently</div>
        </div>
        <button className="btn btn-danger btn-sm" type="button" onClick={() => setConfirming(true)} aria-expanded={confirming} aria-controls="delConfirm">
          Delete
        </button>
      </div>
      {confirming && (
        <div className="tip warm" id="delConfirm">
          <Ms name="warning" />
          <div className="stack" style={{ gap: 10 }}>
            <span>
              This can&apos;t be undone. Your dogs, lesson progress, practice history, videos and order history in Bonded are erased,
              and you lose access to your chapters. Paddle, our payment provider, keeps its own receipts as the law requires.
            </span>
            <label className="label" htmlFor="delType">
              Type DELETE to confirm
            </label>
            <input className="input" id="delType" style={{ height: 42 }} autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} />
            {error && (
              <span role="alert" style={{ color: "var(--danger)" }}>
                {error}
              </span>
            )}
            <div className="row">
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setConfirming(false)}>
                Keep my account
              </button>
              <button className="btn btn-danger btn-sm" type="button" onClick={remove} disabled={pending || typed.trim() !== "DELETE"}>
                {pending ? "Deleting…" : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
