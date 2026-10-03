"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorResult } from "../actions";

export type SaveStatus = "saved" | "unsaved" | "saving" | "error" | "conflict";

const DELAY_MS = 800;

/**
 * Saves `value` a moment after it stops changing, one save at a time, carrying the revision the
 * server hands back. `onSaved` runs after each successful save (the editor refreshes the preview).
 */
export function useAutosave<T>(value: T, initialRev: number, save: (rev: number, value: T) => Promise<EditorResult>, onSaved: () => void) {
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string | null>(null);
  const rev = useRef(initialRev);
  const saved = useRef(value);
  const inFlight = useRef<Promise<boolean> | null>(null);
  const latest = useRef(value);

  const saveAll = useCallback(async (): Promise<boolean> => {
    // Keep going while edits arrived during the last save.
    while (latest.current !== saved.current) {
      setStatus("saving");
      const target = latest.current;
      const result = await save(rev.current, target).catch((): EditorResult => ({ ok: false, error: "Couldn't save. Check your connection; your changes are still here." }));
      if (!result.ok) {
        setStatus(result.conflict ? "conflict" : "error");
        setError(result.error);
        return false;
      }
      if (result.rev) rev.current = result.rev;
      saved.current = target;
      setError(null);
      onSaved();
    }
    setStatus("saved");
    return true;
  }, [save, onSaved]);

  /** Saves now (or waits for the save under way). True when the server has everything. */
  const flush = useCallback(async (): Promise<boolean> => {
    while (inFlight.current) await inFlight.current;
    if (latest.current === saved.current) return true;
    inFlight.current = saveAll();
    try {
      return await inFlight.current;
    } finally {
      inFlight.current = null;
    }
  }, [saveAll]);

  useEffect(() => {
    latest.current = value;
    if (value === saved.current) return;
    setStatus((s) => (s === "conflict" ? s : "unsaved"));
    const t = setTimeout(() => void flush(), DELAY_MS);
    return () => clearTimeout(t);
  }, [value, flush]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (status === "saved") return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  /** After a restore or discard: the server already holds `value` at `newRev`. */
  const reset = useCallback((next: T, newRev: number) => {
    rev.current = newRev;
    saved.current = next;
    latest.current = next;
    setStatus("saved");
    setError(null);
  }, []);

  return { status, error, flush, reset, rev };
}

export const STATUS_TEXT: Record<SaveStatus, string> = {
  saved: "All changes saved",
  unsaved: "Unsaved changes",
  saving: "Saving…",
  error: "Not saved",
  conflict: "Changed elsewhere",
};
