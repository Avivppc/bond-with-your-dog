"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PREVIEW_MESSAGES } from "@/lib/site/preview-messages";
import { blockedByLimit, INLINE_CSS, markEditable, targetFor, valueOf } from "./inline";

const sectionEl = (id: string) => document.querySelector<HTMLElement>(`[data-section-id="${CSS.escape(id)}"]`);

function outline(id: string | null) {
  document.querySelectorAll<HTMLElement>("[data-section-id]").forEach((el) => {
    const on = el.dataset.sectionId === id;
    el.style.outline = on ? "2px solid #2563eb" : "";
    el.style.outlineOffset = on ? "-2px" : "";
  });
}

/** Puts the caret where the click landed, so typing starts there. */
function caretAt(x: number, y: number) {
  const range = document.caretRangeFromPoint?.(x, y);
  if (!range) return;
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function startEditing(el: HTMLElement, x: number, y: number) {
  // plaintext-only keeps pasted formatting out; older browsers fall back to true.
  try {
    el.contentEditable = "plaintext-only";
  } catch {
    el.contentEditable = "true";
  }
  el.focus();
  caretAt(x, y);
}

/**
 * Talks to the editor around the preview iframe:
 * - a click on a section selects it there; on a text it starts typing right on the page; on an
 *   image or button it opens that field in the panel;
 * - "refresh" re-renders with the latest draft, "focus" outlines a section and scrolls to it
 *   (waiting for it to appear when it was just added);
 * - Cmd+Z goes to the editor's undo. Links don't navigate in the preview.
 */
export function PreviewBridge() {
  const router = useRouter();

  useEffect(() => {
    const parentOrigin = window.location.origin;
    const send = (msg: Record<string, unknown>) => window.parent.postMessage(msg, parentOrigin);
    let selected: string | null = null;
    let scrollPending = false;
    let editing: HTMLElement | null = null;
    // Moving straight from one text to another isn't the end of typing: wait a moment.
    let endTimer: ReturnType<typeof setTimeout> | null = null;
    let changedSinceStart = false;
    const END_DELAY_MS = 250;

    const style = document.createElement("style");
    style.textContent = INLINE_CSS;
    document.head.appendChild(style);

    function applySelection() {
      outline(selected);
      if (scrollPending && selected) {
        const el = sectionEl(selected);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          scrollPending = false;
        }
      }
    }

    // A refresh re-renders the page: keep the outline and the editable marks, and scroll once a
    // new section shows up.
    const observer = new MutationObserver(() => {
      applySelection();
      if (!editing) markEditable();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    markEditable();

    function onMessage(e: MessageEvent) {
      if (e.origin !== parentOrigin || e.source !== window.parent) return;
      const data = e.data as { type?: string; id?: string | null; scroll?: boolean };
      if (data.type === PREVIEW_MESSAGES.refresh && !editing) router.refresh();
      if (data.type === PREVIEW_MESSAGES.focus) {
        selected = data.id ?? null;
        scrollPending = Boolean(selected) && data.scroll !== false;
        applySelection();
      }
    }

    function select(section: HTMLElement) {
      selected = section.dataset.sectionId ?? null;
      scrollPending = false;
      outline(selected);
      send({ type: PREVIEW_MESSAGES.select, id: selected });
    }

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("[data-preview-insert]")) return;
      const section = target.closest<HTMLElement>("[data-section-id]");
      const text = target.closest<HTMLElement>("[data-edit-path]");
      if (text && section) {
        e.preventDefault();
        if (editing === text) return;
        if (endTimer) clearTimeout(endTimer);
        endTimer = null;
        select(section);
        editing = text;
        startEditing(text, e.clientX, e.clientY);
        return;
      }
      if (target.closest("a")) e.preventDefault();
      if (!section?.dataset.sectionId) return;
      select(section);
      const field = targetFor(section, target);
      if (field) {
        e.preventDefault();
        send({ type: PREVIEW_MESSAGES.focusField, id: section.dataset.sectionId, path: field.path });
      }
    }

    function onInput(e: Event) {
      const el = e.target as HTMLElement;
      if (el !== editing) return;
      const section = el.closest<HTMLElement>("[data-section-id]");
      changedSinceStart = true;
      send({ type: PREVIEW_MESSAGES.edit, id: section?.dataset.sectionId, path: el.dataset.editPath, value: valueOf(el) });
    }

    function onBeforeInput(e: Event) {
      if (editing && e.target === editing && blockedByLimit(editing, e as InputEvent)) e.preventDefault();
    }

    function stopEditing() {
      if (!editing) return;
      editing.removeAttribute("contenteditable");
      editing = null;
      if (endTimer) clearTimeout(endTimer);
      endTimer = setTimeout(() => {
        endTimer = null;
        if (editing) return;
        send({ type: PREVIEW_MESSAGES.editEnd, changed: changedSinceStart });
        changedSinceStart = false;
      }, END_DELAY_MS);
    }

    function onKey(e: KeyboardEvent) {
      if (editing && (e.key === "Escape" || (e.key === "Enter" && !e.shiftKey))) {
        e.preventDefault();
        editing.blur();
        return;
      }
      if (!(e.metaKey || e.ctrlKey) || (e.target as HTMLElement | null)?.closest("input, textarea, [contenteditable]")) return;
      const key = e.key.toLowerCase();
      if (key !== "z" && key !== "y") return;
      e.preventDefault();
      send({ type: PREVIEW_MESSAGES.key, key: key === "y" || e.shiftKey ? "redo" : "undo" });
    }

    function onFocusOut(e: FocusEvent) {
      if (e.target === editing) stopEditing();
    }

    window.addEventListener("message", onMessage);
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick, true);
    document.addEventListener("input", onInput, true);
    document.addEventListener("beforeinput", onBeforeInput, true);
    document.addEventListener("focusout", onFocusOut, true);
    send({ type: PREVIEW_MESSAGES.ready });
    return () => {
      observer.disconnect();
      style.remove();
      window.removeEventListener("message", onMessage);
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("beforeinput", onBeforeInput, true);
      if (endTimer) clearTimeout(endTimer);
      document.removeEventListener("focusout", onFocusOut, true);
    };
  }, [router]);

  return null;
}
