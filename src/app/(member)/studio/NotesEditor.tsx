"use client";

import { useState, useTransition } from "react";
import { Ms } from "@/components/app/ui";
import { formatClock } from "@/lib/feedback/format";
import { deleteNote, updateNote } from "./actions";

interface Note {
  id: string;
  at_seconds: number;
  body: string;
}

function NoteRow({ note, onSeek, onError }: { note: Note; onSeek: (t: number) => void; onError: (msg: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note.body);
  const [pending, start] = useTransition();

  function save() {
    start(async () => {
      const res = await updateNote({ noteId: note.id, body: text });
      if (res.ok) setEditing(false);
      else onError(res.error);
    });
  }

  function remove() {
    start(async () => {
      const res = await deleteNote(note.id);
      if (!res.ok) onError(res.error);
    });
  }

  return (
    <div className="comment" style={{ gridTemplateColumns: "64px minmax(0, 1fr) auto", alignItems: "start" }}>
      <button type="button" className="ts" onClick={() => onSeek(note.at_seconds)} aria-label={`Play from ${formatClock(note.at_seconds)}`}>
        {formatClock(note.at_seconds)}
      </button>
      {editing ? (
        <input className="input" style={{ height: 40 }} value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} aria-label="Edit note" autoFocus />
      ) : (
        <span>{note.body}</span>
      )}
      <span className="row" style={{ gap: 4 }}>
        {editing ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={save} disabled={pending || !text.trim()}>
            Save
          </button>
        ) : (
          <button type="button" className="icon-btn" onClick={() => setEditing(true)} aria-label={`Edit note at ${formatClock(note.at_seconds)}`}>
            <Ms name="edit" size="sm" />
          </button>
        )}
        <button type="button" className="icon-btn" onClick={remove} disabled={pending} aria-label={`Delete note at ${formatClock(note.at_seconds)}`}>
          <Ms name="delete" size="sm" />
        </button>
      </span>
    </div>
  );
}

/** Roni's pinned notes in the Studio: jump to the moment, edit or delete. */
export function NotesEditor({ notes, onSeek, onError }: { notes: Note[]; onSeek: (t: number) => void; onError: (msg: string) => void }) {
  if (notes.length === 0) return <p className="faint">No notes yet. Pause on a moment and pin one.</p>;
  return (
    <div className="stack" style={{ gap: 4 }} aria-label="Pinned notes">
      {notes.map((n) => (
        <NoteRow key={`${n.id}-${n.body}`} note={n} onSeek={onSeek} onError={onError} />
      ))}
    </div>
  );
}
