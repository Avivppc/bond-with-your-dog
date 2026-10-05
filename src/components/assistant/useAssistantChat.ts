"use client";

import { useCallback, useRef, useState } from "react";
import { MESSAGE_MAX_CHARS, type AssistantMode, type AssistantReply } from "@/lib/assistant/types";

/** Chat state for one "Ask Bonded" panel: the messages, sending, errors and the handoff to Roni. */

export interface ChatBubble {
  id: number;
  role: "user" | "assistant";
  content: string;
}

export interface Handoff {
  askedRoni: boolean;
}

interface ChatOptions {
  mode: AssistantMode;
  lessonId?: string;
  page?: string;
}

const NETWORK_ERROR = "Couldn't reach the assistant. Check your connection and try again.";
const GENERIC_ERROR = "Something went wrong. Please try again.";

function isReply(value: unknown): value is AssistantReply {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.reply === "string" && typeof v.handedOff === "boolean" && typeof v.askedRoni === "boolean";
}

function errorText(value: unknown): string {
  const error = value && typeof value === "object" ? (value as Record<string, unknown>).error : null;
  return typeof error === "string" && error ? error : GENERIC_ERROR;
}

export function useAssistantChat({ mode, lessonId, page }: ChatOptions) {
  const [messages, setMessages] = useState<readonly ChatBubble[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const conversationId = useRef<string | null>(null);
  const nextId = useRef(1);

  const append = useCallback((role: ChatBubble["role"], content: string): number => {
    const bubble = { id: nextId.current++, role, content };
    setMessages((prev) => [...prev, bubble]);
    return bubble.id;
  }, []);

  /** A question that got no answer comes off the list; its text stays in the box to retry. */
  const retract = useCallback((id: number) => setMessages((prev) => prev.filter((b) => b.id !== id)), []);

  const send = useCallback(
    async (text: string): Promise<boolean> => {
      const message = text.trim().slice(0, MESSAGE_MAX_CHARS);
      if (!message || pending) return false;
      setPending(true);
      setError(null);
      const questionId = append("user", message);
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            mode,
            message,
            conversationId: conversationId.current ?? undefined,
            lessonId,
            page: page ?? window.location.pathname,
          }),
        });
        const data: unknown = await res.json().catch(() => null);
        if (!res.ok || !isReply(data)) {
          retract(questionId);
          setError(errorText(data));
          return false;
        }
        conversationId.current = data.conversationId ?? conversationId.current;
        append("assistant", data.reply);
        if (data.handedOff) setHandoff({ askedRoni: data.askedRoni });
        return true;
      } catch {
        retract(questionId);
        setError(NETWORK_ERROR);
        return false;
      } finally {
        setPending(false);
      }
    },
    [append, retract, lessonId, mode, page, pending],
  );

  return { messages, pending, error, handoff, send };
}
