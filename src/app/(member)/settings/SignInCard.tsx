"use client";

import { useState, useTransition } from "react";
import { changeEmail, sendPasswordReset } from "./actions";
import { useToast } from "../feedback/_components/Toast";

/** Sign-in: email (with change), password reset by email, and Google when it's connected. */
export function SignInCard({ email, hasGoogle, hasPassword }: { email: string; hasGoogle: boolean; hasPassword: boolean }) {
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [toast, showToast] = useToast();

  function saveEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await changeEmail(newEmail);
      if (!res.ok) return setError(res.error);
      setEditing(false);
      setNewEmail("");
      showToast(res.message ?? "Check your inbox to confirm");
    });
  }

  function reset() {
    start(async () => {
      const res = await sendPasswordReset();
      showToast(res.ok ? (res.message ?? "Reset link sent") : res.error);
    });
  }

  return (
    <div className="card">
      <h2 className="h3">Sign-in</h2>
      <div className="list">
        <div className="set-row">
          <div className="grow">
            <b>Email</b>
            <div className="faint">{email}</div>
          </div>
          {!editing && (
            <button className="link" type="button" onClick={() => setEditing(true)}>
              Change
            </button>
          )}
        </div>
        {editing && (
          <form className="stack" style={{ gap: 10, paddingBottom: 16 }} onSubmit={saveEmail}>
            <label className="label" htmlFor="newEmail">
              New email
            </label>
            <input className="input" id="newEmail" type="email" autoComplete="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            {error && (
              <span className="faint" role="alert" style={{ color: "var(--danger)" }}>
                {error}
              </span>
            )}
            <div className="row">
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="btn btn-primary btn-sm" type="submit" disabled={pending}>
                Send confirmation
              </button>
            </div>
          </form>
        )}
        <div className="set-row">
          <div className="grow">
            <b>Password</b>
            <div className="faint">{hasPassword ? "We'll email you a link to set a new one" : "Add a password by email to sign in without Google"}</div>
          </div>
          <button className="link" type="button" onClick={reset} disabled={pending}>
            {hasPassword ? "Reset" : "Set one"}
          </button>
        </div>
        {hasGoogle && (
          <div className="set-row">
            <div className="grow">
              <b>Google</b>
              <div className="faint">Connected</div>
            </div>
            <span className="pill reliable">On</span>
          </div>
        )}
      </div>
      {toast}
    </div>
  );
}
