"use client";

import { useState, useTransition } from "react";
import { saveAboutYou, savePracticePrefs } from "@/app/(member)/member-actions";
import { PhotoDrop } from "@/components/app/PhotoDrop";
import { Ms, WEEKDAYS, WEEK_ORDER } from "@/components/app/ui";
import { GOALS, SESSION_LENGTHS } from "@/lib/member/schemas";
import type { Goal } from "@/lib/member/viewer";

function Saved({ message }: { message: { ok: boolean; text: string } | null }) {
  if (!message) return null;
  return (
    <span role="status" className="faint" style={message.ok ? { color: "var(--teal)" } : { color: "var(--danger)" }}>
      {message.text}
    </span>
  );
}

export function EditProfileForm({ fullName, location, avatarUrl, onDone }: { fullName: string; location: string; avatarUrl: string | null; onDone?: () => void }) {
  const [form, setForm] = useState({ fullName, location, avatarUrl });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveAboutYou({ fullName: form.fullName, location: form.location || undefined, avatarUrl: form.avatarUrl });
          setMessage(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: res.error });
          if (res.ok) onDone?.();
        });
      }}
    >
      <h2 className="h3">Edit profile</h2>
      <PhotoDrop kind="avatar" value={form.avatarUrl} onChange={(url) => setForm((f) => ({ ...f, avatarUrl: url }))} size={88} label="Your photo" />
      <div className="grid-2" style={{ gap: 16 }}>
        <div className="field">
          <label htmlFor="p-name">Name</label>
          <input id="p-name" className="input" value={form.fullName} maxLength={120} required onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} />
        </div>
        <div className="field">
          <label htmlFor="p-loc">Location (optional)</label>
          <input id="p-loc" className="input" value={form.location} maxLength={120} placeholder="City, country" onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
        </div>
      </div>
      <div className="between" style={{ alignItems: "center" }}>
        <Saved message={message} />
        <button className="btn btn-primary btn-sm" type="submit" disabled={pending || !form.fullName.trim()}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

export function PracticePrefsCard({ goals, sessionMinutes, practiceDays }: { goals: Goal[]; sessionMinutes: 5 | 10 | 15; practiceDays: number[] }) {
  const [state, setState] = useState({ goals, minutes: sessionMinutes, days: practiceDays });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function save(next: typeof state) {
    setState(next);
    start(async () => {
      const res = await savePracticePrefs({ goals: next.goals, sessionMinutes: next.minutes, practiceDays: next.days });
      setMessage(res.ok ? { ok: true, text: "Saved." } : { ok: false, text: res.error });
    });
  }
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  return (
    <div className="card">
      <div className="between" style={{ alignItems: "center" }}>
        <h2 className="h3">Training preferences</h2>
        {pending ? <span className="faint">Saving…</span> : <Saved message={message} />}
      </div>
      <div className="field">
        <span className="label">Practice days</span>
        <div className="row">
          {WEEK_ORDER.map((d) => (
            <button key={d} type="button" className={`chip ${state.days.includes(d) ? "on" : ""}`} aria-pressed={state.days.includes(d)} onClick={() => save({ ...state, days: toggle(state.days, d) })}>
              {WEEKDAYS[d]}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label">Session length</span>
        <div className="seg" role="radiogroup" aria-label="Session length">
          {SESSION_LENGTHS.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={state.minutes === m} className={state.minutes === m ? "on" : undefined} onClick={() => save({ ...state, minutes: m })}>
              {m} min
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label">Goals</span>
        <div className="row">
          {GOALS.map((g) => (
            <button key={g.key} type="button" className={`chip ${state.goals.includes(g.key) ? "on" : ""}`} aria-pressed={state.goals.includes(g.key)} onClick={() => save({ ...state, goals: toggle(state.goals, g.key) })}>
              <Ms name={g.icon} size="sm" />
              {g.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProfileHeaderActions({ fullName, location, avatarUrl }: { fullName: string; location: string; avatarUrl: string | null }) {
  const [editing, setEditing] = useState(false);
  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
        <Ms name={editing ? "close" : "edit"} size="sm" />
        {editing ? "Close" : "Edit profile"}
      </button>
      {editing && (
        <div style={{ flexBasis: "100%" }}>
          <EditProfileForm fullName={fullName} location={location} avatarUrl={avatarUrl} onDone={() => setEditing(false)} />
        </div>
      )}
    </>
  );
}
