"use client";

import { useEffect, useRef, useState, useTransition, type RefObject } from "react";
import { createSavedReply, listSavedReplies } from "@/app/admin/coaching/replies/actions";
import { fillReply, filterReplies, toTemplate, unfilledTags, type ReplyVars, type SavedReply } from "@/lib/saved-replies/replies";

interface SavedRepliesProps {
  /** The reply box the picker writes into (its caret decides where the text goes). */
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (next: string) => void;
  /** The member being answered, for {{first_name}} and friends. */
  vars: ReplyVars;
}

const MANAGE_HREF = "/admin/coaching/replies";

/** Puts text at the caret (or over the selection); an empty box is simply replaced. */
function insertText(value: string, el: HTMLTextAreaElement | null, text: string): { value: string; caret: number } {
  if (!value.trim()) return { value: text, caret: text.length };
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  return { value: value.slice(0, start) + text + value.slice(end), caret: start + text.length };
}

/**
 * "Saved replies" under a reply box: search the team's replies, click to insert one filled in for
 * this member, or save the current text as a new reply. Warns while a {{tag}} is still unfilled.
 */
export function SavedReplies({ textareaRef, value, onChange, vars }: SavedRepliesProps) {
  const [open, setOpen] = useState(false);
  const [replies, setReplies] = useState<SavedReply[] | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [naming, setNaming] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const root = useRef<HTMLDivElement>(null);
  const toggleButton = useRef<HTMLButtonElement>(null);
  const leftover = unfilledTags(value);
  const shown = replies ? filterReplies(replies, query) : [];

  useEffect(() => {
    if (!open) return;
    function onPointer(e: PointerEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  function load() {
    start(async () => {
      const res = await listSavedReplies();
      if (res.ok) setReplies(res.data);
      else setMessage(res.error);
    });
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    setMessage(null);
    setNaming(false);
    if (next && replies === null) load();
  }

  function insert(reply: SavedReply) {
    const el = textareaRef.current;
    const next = insertText(value, el, fillReply(reply.body, vars));
    onChange(next.value);
    setOpen(false);
    setQuery("");
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(next.caret, next.caret);
    });
  }

  function save() {
    start(async () => {
      const res = await createSavedReply({ title, body: toTemplate(value, vars) });
      if (!res.ok) {
        setMessage(res.error);
        return;
      }
      setReplies((list) => [...(list ?? []), res.data].sort((a, b) => a.title.localeCompare(b.title)));
      setNaming(false);
      setTitle("");
      setMessage(`Saved "${res.data.title}".`);
    });
  }

  function close() {
    setOpen(false);
    setNaming(false);
    toggleButton.current?.focus();
  }

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (shown.length ? (i + step + shown.length) % shown.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (shown[active]) insert(shown[active]);
    }
  }

  return (
    <div ref={root} className="relative flex flex-col items-start gap-1">
      <button
        type="button"
        ref={toggleButton}
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1 rounded-full border border-[#d9d8d6] bg-white px-3 py-1 text-[13px] font-medium text-[#1a1a19] hover:bg-[#f3f3f2]"
      >
        <span className="material-symbols-outlined" aria-hidden style={{ fontSize: 16 }}>
          quickreply
        </span>
        Saved replies
      </button>
      {leftover.length > 0 && (
        <p role="status" className="text-[12px] text-[#8a5a00]">
          Fill in {leftover.map((t) => `{{${t}}}`).join(", ")} before sending.
        </p>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Saved replies"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              close();
            }
          }}
          className="absolute top-full left-0 z-30 mt-1 flex w-[min(380px,calc(100vw-32px))] flex-col rounded-[12px] border border-[#e7e6e4] bg-white text-left text-[14px] text-[#1a1a19] shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
        >
          <div className="border-b border-[#efeeed] p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onSearchKey}
              placeholder="Search saved replies…"
              aria-label="Search saved replies"
              className="w-full rounded-[8px] border border-[#d9d8d6] px-3 py-1.5 text-[14px] focus:border-[#343332] focus:outline-none"
            />
          </div>
          <ul className="max-h-[280px] overflow-y-auto py-1" aria-label="Replies">
            {replies === null && <li className="px-3 py-2 text-[#6c6a69]">{pending ? "Loading…" : "The list didn't load. Close and try again."}</li>}
            {replies !== null && shown.length === 0 && (
              <li className="px-3 py-2 text-[#6c6a69]">{replies.length === 0 ? "No saved replies yet. Write a reply, then save it below." : "Nothing matches."}</li>
            )}
            {shown.map((r, i) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => insert(r)}
                  onMouseEnter={() => setActive(i)}
                  aria-current={i === active ? "true" : undefined}
                  className={`block w-full px-3 py-2 text-left ${i === active ? "bg-[#f3f3f2]" : ""}`}
                >
                  <span className="block font-medium">{r.title}</span>
                  <span className="line-clamp-2 block text-[12px] text-[#6c6a69]">{r.body}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 border-t border-[#efeeed] p-2">
            {naming ? (
              // Not a <form>: the picker sits inside the reply's form, and Enter must never send the reply.
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (title.trim() && !pending) save();
                    } else if (e.key === "Escape") {
                      setNaming(false);
                    }
                  }}
                  maxLength={80}
                  placeholder="Name, e.g. Great first video"
                  aria-label="Reply name"
                  className="min-w-0 flex-1 rounded-[8px] border border-[#d9d8d6] px-3 py-1.5 text-[14px] focus:border-[#343332] focus:outline-none"
                />
                <button type="button" onClick={save} disabled={pending || !title.trim()} className="rounded-full bg-[#343332] px-3 py-1.5 text-[13px] font-medium text-white disabled:opacity-50">
                  Save
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={!value.trim() || replies === null}
                  onClick={() => setNaming(true)}
                  className="text-[13px] font-medium text-[#1a1a19] underline-offset-2 hover:underline disabled:text-[#9b9997] disabled:no-underline"
                >
                  Save this text as a reply
                </button>
                <a href={MANAGE_HREF} target="_blank" rel="noopener" className="text-[13px] text-[#6c6a69] hover:underline">
                  Manage
                </a>
              </div>
            )}
            {message && (
              <p role="status" className="text-[12px] text-[#6c6a69]">
                {message}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
