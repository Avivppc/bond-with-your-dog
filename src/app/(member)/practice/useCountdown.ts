"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { remainingSeconds } from "@/lib/practice/session";

export type CountdownStatus = "ready" | "running" | "paused" | "done";

const TICK_MS = 250;

/**
 * A wall-clock countdown (keeps time correctly even when the tab is throttled). A new
 * `resetKey` (the next step) resets it.
 */
export function useCountdown(total: number, resetKey: string | number) {
  const [left, setLeft] = useState(total);
  const [status, setStatus] = useState<CountdownStatus>("ready");
  const anchor = useRef<{ at: number; left: number } | null>(null);
  const key = `${resetKey}:${total}`;
  const [lastKey, setLastKey] = useState(key);

  if (lastKey !== key) {
    // New step: reset during render (React's "adjust state on prop change" pattern).
    setLastKey(key);
    setLeft(total);
    setStatus("ready");
  }

  useEffect(() => {
    if (status !== "running") return;
    const id = window.setInterval(() => {
      const a = anchor.current;
      if (!a) return;
      const next = remainingSeconds(a.left, Date.now() - a.at);
      setLeft(next);
      if (next === 0) {
        anchor.current = null;
        setStatus("done");
      }
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [status]);

  const start = useCallback(() => {
    const from = left > 0 ? left : total;
    anchor.current = { at: Date.now(), left: from };
    setLeft(from);
    setStatus("running");
  }, [left, total]);

  const pause = useCallback(() => {
    const a = anchor.current;
    if (a) setLeft(remainingSeconds(a.left, Date.now() - a.at));
    anchor.current = null;
    setStatus("paused");
  }, []);

  const reset = useCallback(() => {
    anchor.current = null;
    setLeft(total);
    setStatus("ready");
  }, [total]);

  return { left, status, start, pause, reset };
}
