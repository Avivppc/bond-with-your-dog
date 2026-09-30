"use client";

import { useState, useTransition } from "react";
import { sendQaQuestion, shareStory } from "./hub-actions";
import { Ms } from "@/components/app/ui";

type Status = { ok: boolean; text: string } | null;

function StatusLine({ status, fallback, light = false }: { status: Status; fallback?: string; light?: boolean }) {
  const color = status ? (status.ok ? (light ? "#bff3dd" : "var(--teal)") : light ? "#ffc2b3" : "var(--danger)") : undefined;
  return (
    <span className="faint" role="status" style={{ color }}>
      {status?.text ?? fallback}
    </span>
  );
}

export function QaQuestionForm({ meetupId, calendarHref }: { meetupId: string; calendarHref: string }) {
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<Status>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await sendQaQuestion({ meetupId, body });
          if (res.ok) setBody("");
          setStatus(res.ok ? { ok: true, text: "Sent — Roni will answer it live." } : { ok: false, text: res.error });
        });
      }}
    >
      <label className="label" htmlFor="qaQ">
        Send your question ahead
      </label>
      <textarea id="qaQ" className="input" style={{ minHeight: 84 }} value={body} maxLength={1000} onChange={(e) => setBody(e.target.value)} placeholder="What would you like Roni to answer?" required />
      <div className="row" style={{ justifyContent: "space-between" }}>
        <a className="link" href={calendarHref} download="bonded-live-qa.ics">
          Add to calendar
          <Ms name="event" />
        </a>
        <button className="btn btn-primary btn-sm" type="submit" disabled={pending || body.trim().length < 5}>
          {pending ? "Sending…" : "Send question"}
        </button>
      </div>
      <StatusLine status={status} />
    </form>
  );
}

export function StoryForm() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", consent: false });
  const [status, setStatus] = useState<Status>(null);
  const [pending, start] = useTransition();
  if (!open) {
    return (
      <div>
        <button type="button" className="btn btn-ghost btn-sm" style={{ background: "#fff" }} onClick={() => setOpen(true)}>
          Share your story
        </button>
        {status?.ok && <StatusLine status={status} light />}
      </div>
    );
  }
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await shareStory({ title: form.title || undefined, body: form.body, consentPublic: form.consent });
          setStatus(res.ok ? { ok: true, text: "Thank you — Roni reads every story." } : { ok: false, text: res.error });
          if (res.ok) {
            setForm({ title: "", body: "", consent: false });
            setOpen(false);
          }
        });
      }}
    >
      <input className="input" placeholder="A title (optional)" maxLength={200} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} aria-label="Story title" />
      <textarea className="input" placeholder="What changed for you and your dog?" maxLength={5000} required value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} aria-label="Your story" style={{ minHeight: 110 }} />
      <label className="row" style={{ gap: 8, color: "#bcd0d8", fontSize: 13 }}>
        <input type="checkbox" checked={form.consent} onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))} />
        Roni may share it on the Bonded site
      </label>
      <div className="row">
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending || form.body.trim().length < 20}>
          {pending ? "Sending…" : "Send story"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" style={{ background: "#fff" }} onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <StatusLine status={status} light />
    </form>
  );
}
