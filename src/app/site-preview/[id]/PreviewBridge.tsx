"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PREVIEW_MESSAGES } from "@/lib/site/preview-messages";

function outline(id: string | null) {
  document.querySelectorAll<HTMLElement>("[data-section-id]").forEach((el) => {
    el.style.outline = el.dataset.sectionId === id ? "2px solid #2563eb" : "";
    el.style.outlineOffset = el.dataset.sectionId === id ? "-2px" : "";
  });
}

/**
 * Talks to the editor around the preview iframe: a click on a section selects it there, a
 * "refresh" message re-renders with the latest draft, and "focus" scrolls to and outlines one.
 * Links don't navigate inside the preview.
 */
export function PreviewBridge() {
  const router = useRouter();

  useEffect(() => {
    const parentOrigin = window.location.origin;
    const send = (msg: Record<string, unknown>) => window.parent.postMessage(msg, parentOrigin);

    function onMessage(e: MessageEvent) {
      if (e.origin !== parentOrigin || e.source !== window.parent) return;
      const data = e.data as { type?: string; id?: string | null };
      if (data.type === PREVIEW_MESSAGES.refresh) router.refresh();
      if (data.type === PREVIEW_MESSAGES.focus) {
        outline(data.id ?? null);
        if (data.id) document.querySelector(`[data-section-id="${CSS.escape(data.id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("a")) e.preventDefault();
      const section = target.closest<HTMLElement>("[data-section-id]");
      if (section?.dataset.sectionId) {
        outline(section.dataset.sectionId);
        send({ type: PREVIEW_MESSAGES.select, id: section.dataset.sectionId });
      }
    }

    window.addEventListener("message", onMessage);
    document.addEventListener("click", onClick, true);
    send({ type: PREVIEW_MESSAGES.ready });
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("click", onClick, true);
    };
  }, [router]);

  return null;
}
