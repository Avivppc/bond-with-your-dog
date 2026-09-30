"use client";

import { useState, useTransition } from "react";
import { submitHelpRequest } from "./actions";

const COPY = {
  question: {
    id: "ask",
    icon: "help",
    color: "var(--teal)",
    title: "Ask a question",
    placeholder: "About your account, a course or a purchase…",
    button: "Send question",
    done: "Thanks. Roni's team will answer here and send you a notification.",
  },
  bug: {
    id: "report",
    icon: "bug_report",
    color: "var(--cognac)",
    title: "Report a problem",
    placeholder: "What happened, and on which page?",
    button: "Send report",
    done: "Thanks. The team will look into it.",
  },
} as const;

/** The page the member came from (same site only), so the team sees where it happened. */
function fromPage(): string | null {
  try {
    const ref = document.referrer ? new URL(document.referrer) : null;
    return ref && ref.origin === window.location.origin ? ref.pathname : window.location.pathname;
  } catch {
    return window.location.pathname;
  }
}

/** Help's question / problem forms, with the design's confirmation state. */
export function SupportForm({ kind }: { kind: "question" | "bug" }) {
  const c = COPY[kind];
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return setError(kind === "bug" ? "Tell us what happened first." : "Write your question first.");
    setError(null);
    start(async () => {
      const res = await submitHelpRequest({ kind, body, pageUrl: fromPage() });
      if (!res.ok) return setError(res.error);
      setBody("");
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="card tight" id={c.id} role="status">
        <span className="ms" style={{ color: "var(--teal)" }} aria-hidden>
          check_circle
        </span>
        <b>Sent</b>
        <p className="faint">{c.done}</p>
        <button className="btn btn-ghost btn-sm" type="button" style={{ alignSelf: "flex-start" }} onClick={() => setSent(false)}>
          Send another
        </button>
      </div>
    );
  }

  return (
    <form className="card tight" id={c.id} onSubmit={submit}>
      <span className="ms" style={{ color: c.color }} aria-hidden>
        {c.icon}
      </span>
      <label htmlFor={`${c.id}Text`}>
        <b>{c.title}</b>
      </label>
      <textarea
        className="input"
        id={`${c.id}Text`}
        style={{ minHeight: 84 }}
        maxLength={5000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={c.placeholder}
      />
      {error && (
        <span role="alert" className="faint" style={{ color: "var(--danger)" }}>
          {error}
        </span>
      )}
      <button className="btn btn-ghost btn-sm" type="submit" style={{ alignSelf: "flex-start" }} disabled={pending}>
        {pending ? "Sending…" : c.button}
      </button>
    </form>
  );
}
