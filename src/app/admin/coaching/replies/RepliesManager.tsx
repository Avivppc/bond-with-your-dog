"use client";

import { useRef, useState, useTransition } from "react";
import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY, Card, EmptyState, INPUT, LABEL, Notice } from "@/app/admin/_components/ui";
import { filterReplies, REPLY_BODY_MAX, REPLY_TAGS, REPLY_TITLE_MAX, type SavedReply } from "@/lib/saved-replies/replies";
import { createSavedReply, deleteSavedReply, updateSavedReply } from "./actions";

const byTitle = (a: SavedReply, b: SavedReply) => a.title.localeCompare(b.title);

interface EditorProps {
  initial: { title: string; body: string };
  saveLabel: string;
  pending: boolean;
  onSave: (value: { title: string; body: string }) => void;
  onCancel: () => void;
}

/** Name + text, with chips that drop a {{tag}} at the caret. */
function ReplyEditor({ initial, saveLabel, pending, onSave, onCancel }: EditorProps) {
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const box = useRef<HTMLTextAreaElement>(null);

  function insertTag(key: string) {
    const el = box.current;
    const tag = `{{${key}}}`;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + tag + body.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + tag.length, start + tag.length);
    });
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ title, body });
      }}
    >
      <label className="flex flex-col gap-1">
        <span className={LABEL}>Name</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={REPLY_TITLE_MAX} required placeholder="Great first video" className={INPUT} />
      </label>
      <label className="flex flex-col gap-1">
        <span className={LABEL}>Text</span>
        <textarea ref={box} value={body} onChange={(e) => setBody(e.target.value)} maxLength={REPLY_BODY_MAX} required rows={5} className={`${INPUT} resize-y`} />
      </label>
      <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-[#6c6a69]">
        Insert:
        {REPLY_TAGS.map((t) => (
          <button key={t.key} type="button" onClick={() => insertTag(t.key)} className="rounded-full border border-[#d9d8d6] bg-white px-2.5 py-0.5 text-[12px] text-[#1a1a19] hover:bg-[#f3f3f2]">
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={pending || !title.trim() || !body.trim()} className={BTN_PRIMARY}>
          {pending ? "Saving…" : saveLabel}
        </button>
        <button type="button" onClick={onCancel} className={BTN_SECONDARY}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function RepliesManager({ initial, loadError }: { initial: SavedReply[]; loadError: string | null }) {
  const [replies, setReplies] = useState(initial);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(loadError ? { tone: "error", text: loadError } : null);
  const [pending, start] = useTransition();
  const shown = filterReplies(replies, query);

  function create(value: { title: string; body: string }) {
    start(async () => {
      const res = await createSavedReply(value);
      if (!res.ok) return setNotice({ tone: "error", text: res.error });
      setReplies((list) => [...list, res.data].sort(byTitle));
      setEditing(null);
      setNotice({ tone: "success", text: `Saved "${res.data.title}".` });
    });
  }

  function update(id: string, value: { title: string; body: string }) {
    start(async () => {
      const res = await updateSavedReply(id, value);
      if (!res.ok) return setNotice({ tone: "error", text: res.error });
      setReplies((list) => list.map((r) => (r.id === id ? res.data : r)).sort(byTitle));
      setEditing(null);
      setNotice({ tone: "success", text: `Saved "${res.data.title}".` });
    });
  }

  function remove(reply: SavedReply) {
    if (!window.confirm(`Delete "${reply.title}"? This can't be undone.`)) return;
    start(async () => {
      const res = await deleteSavedReply(reply.id);
      if (!res.ok) return setNotice({ tone: "error", text: res.error });
      setReplies((list) => list.filter((r) => r.id !== reply.id));
      setNotice({ tone: "success", text: `Deleted "${reply.title}".` });
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      <div className="flex flex-wrap items-center gap-2">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search replies…" aria-label="Search replies" className={`${INPUT} max-w-xs`} />
        <button type="button" onClick={() => setEditing("new")} disabled={editing === "new"} className={`${BTN_PRIMARY} ml-auto`}>
          New reply
        </button>
      </div>

      {editing === "new" && (
        <Card title="New reply">
          <ReplyEditor initial={{ title: "", body: "" }} saveLabel="Save reply" pending={pending} onSave={create} onCancel={() => setEditing(null)} />
        </Card>
      )}

      {replies.length === 0 && editing !== "new" ? (
        <EmptyState title="No saved replies yet">
          Add the answers you give often, or use &quot;Save this text as a reply&quot; under any reply box.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {shown.map((r) => (
            <li key={r.id}>
              <Card>
                {editing === r.id ? (
                  <ReplyEditor initial={r} saveLabel="Save changes" pending={pending} onSave={(value) => update(r.id, value)} onCancel={() => setEditing(null)} />
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h2 className="font-semibold text-[#1a1a19]">{r.title}</h2>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setEditing(r.id)} className={BTN_SECONDARY}>
                          Edit
                        </button>
                        <button type="button" onClick={() => remove(r)} disabled={pending} className={BTN_DANGER}>
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="whitespace-pre-wrap text-[14px] text-[#3d3c3b]">{r.body}</p>
                  </div>
                )}
              </Card>
            </li>
          ))}
          {replies.length > 0 && shown.length === 0 && <li className="text-[14px] text-[#6c6a69]">Nothing matches &quot;{query}&quot;.</li>}
        </ul>
      )}
    </div>
  );
}
