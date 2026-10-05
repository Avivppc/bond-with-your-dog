"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Changes this close together (typing a word) are one undo step. */
const COALESCE_MS = 700;
const MAX_STEPS = 100;

interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

/**
 * Editor state with undo/redo. `set` records a step (quick successive changes merge into one);
 * Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z (or Ctrl+Y) work everywhere except inside a text field, where
 * the browser's own undo for that field applies.
 */
export function useHistory<T>(initial: T) {
  const [h, setH] = useState<History<T>>({ past: [], present: initial, future: [] });
  const lastChange = useRef(0);

  const set = useCallback((update: (prev: T) => T) => {
    setH((cur) => {
      const next = update(cur.present);
      if (next === cur.present) return cur;
      const now = Date.now();
      const merge = now - lastChange.current < COALESCE_MS && cur.past.length > 0;
      lastChange.current = now;
      return { past: merge ? cur.past : [...cur.past, cur.present].slice(-MAX_STEPS), present: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    lastChange.current = 0;
    setH((cur) => (cur.past.length === 0 ? cur : { past: cur.past.slice(0, -1), present: cur.past[cur.past.length - 1], future: [cur.present, ...cur.future] }));
  }, []);

  const redo = useCallback(() => {
    lastChange.current = 0;
    setH((cur) => (cur.future.length === 0 ? cur : { past: [...cur.past, cur.present], present: cur.future[0], future: cur.future.slice(1) }));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable=true]")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return { value: h.present, set, undo, redo, canUndo: h.past.length > 0, canRedo: h.future.length > 0 };
}
