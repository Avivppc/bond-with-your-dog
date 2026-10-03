"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { MESSAGE_MAX_CHARS, type AssistantMode } from "@/lib/assistant/types";
import { useAssistantChat, type ChatBubble, type Handoff } from "./useAssistantChat";

/** "Ask Bonded" chat: the lesson card (members) and the floating sales launcher (visitors). */

export interface AssistantPanelProps {
  mode: AssistantMode;
  lessonId?: string;
  page?: string;
  title: string;
  intro: string;
  /** "inline" sits in the page (the lesson card); "floating" fills the launcher's popup. */
  variant?: "inline" | "floating";
}

function Bubble({ bubble }: { bubble: ChatBubble }) {
  const mine = bubble.role === "user";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <p
        dir="auto"
        className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[14.5px] leading-relaxed ${
          mine ? "rounded-br-md bg-primary-container text-on-primary-container" : "rounded-bl-md bg-surface-container-low text-on-surface"
        }`}
      >
        <span className="sr-only">{mine ? "You: " : "Bonded: "}</span>
        {bubble.content}
      </p>
    </div>
  );
}

function HandoffNote({ handoff, mode }: { handoff: Handoff; mode: AssistantMode }) {
  if (mode !== "member") return null;
  return (
    <div className="rounded-xl bg-tertiary-container/30 px-3.5 py-2.5 text-[13.5px] text-on-surface" role="note">
      <b className="block">Ask Roni instead</b>
      {handoff.askedRoni ? (
        <>We sent your question to Roni privately. You&apos;ll get a notification when she answers.</>
      ) : (
        <>
          This one is best for Roni.{" "}
          <Link className="font-semibold underline" href="/help#ask">
            Ask her in Help
          </Link>{" "}
          or send her a video.
        </>
      )}
    </div>
  );
}

export default function AssistantPanel({ mode, lessonId, page, title, intro, variant = "inline" }: AssistantPanelProps) {
  const { messages, pending, error, handoff, send } = useAssistantChat({ mode, lessonId, page });
  const [input, setInput] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const ids = useId();
  const titleId = `${ids}-title`;
  const inputId = `${ids}-input`;

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, pending]);

  const submit = async () => {
    const text = input;
    if (!text.trim() || pending) return;
    setInput("");
    const ok = await send(text);
    if (!ok) setInput(text);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    void submit();
  };

  const logHeight = variant === "floating" ? "min-h-0 flex-1" : "max-h-[50vh] min-h-[96px]";

  return (
    <section className={`flex flex-col gap-3 ${variant === "floating" ? "h-full" : ""}`} aria-labelledby={titleId}>
      <header className={variant === "floating" ? "pr-10" : ""}>
        <h2 id={titleId} className="font-headline text-[17px] font-bold text-on-surface">
          {title}
        </h2>
        <p className="text-[13.5px] text-on-surface-variant">{intro}</p>
      </header>

      <div ref={logRef} role="log" aria-live="polite" aria-label="Conversation" className={`flex flex-col gap-2.5 overflow-y-auto ${logHeight}`}>
        {messages.map((m) => (
          <Bubble key={m.id} bubble={m} />
        ))}
        {pending && (
          <p className="text-[13.5px] italic text-on-surface-variant" aria-hidden>
            Thinking…
          </p>
        )}
      </div>

      {handoff && <HandoffNote handoff={handoff} mode={mode} />}
      {error && (
        <p className="text-[13.5px] font-medium text-error" role="alert">
          {error}
        </p>
      )}

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label htmlFor={inputId} className="sr-only">
          Your question
        </label>
        <textarea
          id={inputId}
          dir="auto"
          rows={2}
          value={input}
          maxLength={MESSAGE_MAX_CHARS}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Type your question…"
          aria-describedby={`${ids}-hint`}
          className="min-h-[44px] flex-1 resize-none rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-[15px] text-on-surface placeholder:text-outline focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-primary px-4 text-[14px] font-semibold text-white transition hover:bg-primary-dim disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </form>
      <p id={`${ids}-hint`} className="text-[12px] text-on-surface-variant">
        Enter to send, Shift+Enter for a new line.
      </p>
    </section>
  );
}
