"use client";

import { useState, useTransition } from "react";
import { askLessonQuestion } from "./question-actions";

export function AskForm({ lessonId, courseId }: { lessonId: string; courseId: string }) {
  const [body, setBody] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="card tight"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await askLessonQuestion({ lessonId, courseId, body });
          if (res.ok) {
            setBody("");
            setMessage({ ok: true, text: "Sent. Roni's team will answer here, and we'll let you know." });
          } else setMessage({ ok: false, text: res.error });
        });
      }}
    >
      <label className="label" htmlFor="ask-q">
        Ask about this lesson
      </label>
      <textarea id="ask-q" className="input" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} required placeholder="What would you like to ask Roni?" />
      <div className="between" style={{ alignItems: "center" }}>
        <span className="faint" role="status" style={message && !message.ok ? { color: "var(--danger)" } : undefined}>
          {message?.text ?? "Everyone in the course can read questions and answers."}
        </span>
        <button className="btn btn-primary btn-sm" type="submit" disabled={pending || body.trim().length < 3}>
          {pending ? "Sending…" : "Send question"}
        </button>
      </div>
    </form>
  );
}
