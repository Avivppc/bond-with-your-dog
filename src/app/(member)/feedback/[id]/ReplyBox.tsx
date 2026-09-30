"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { replyToFeedback } from "../actions";
import { useToast } from "../_components/Toast";

/** "Reply to Roni" card: sends a message under the video, then "Practise these notes". */
export function ReplyBox({ videoId, practiceHref, placeholder }: { videoId: string; practiceHref: string; placeholder: string }) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [toast, showToast] = useToast();

  function send() {
    setError(null);
    start(async () => {
      const res = await replyToFeedback({ videoId, body });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBody("");
      showToast("Reply sent to Roni");
    });
  }

  return (
    <div className="card tight">
      <label className="label" htmlFor="replyRoni">
        Reply to Roni
      </label>
      <textarea className="input" id="replyRoni" maxLength={2000} value={body} onChange={(e) => setBody(e.target.value)} placeholder={placeholder} />
      {error && (
        <p className="faint" role="alert" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <div className="row" style={{ justifyContent: "space-between" }}>
        <button className="btn btn-ghost btn-sm" type="button" onClick={send} disabled={pending || body.trim().length === 0}>
          {pending ? "Sending…" : "Send reply"}
        </button>
        <Link className="btn btn-primary btn-sm" href={practiceHref}>
          Practise these notes
        </Link>
      </div>
      {toast}
    </div>
  );
}
