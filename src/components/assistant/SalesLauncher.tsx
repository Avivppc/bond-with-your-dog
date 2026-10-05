"use client";

import { useEffect, useRef, useState } from "react";
import AssistantPanel from "./AssistantPanel";

/**
 * The floating "Questions? Ask us" button on public pages. Asks the API whether the sales
 * assistant is switched on (so static pages follow the admin switch without a redeploy).
 */
export default function SalesLauncher() {
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/assistant", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: unknown) => {
        if (data && typeof data === "object" && (data as { sales?: unknown }).sales === true) setEnabled(true);
      })
      .catch(() => {
        // Not shown when the status can't be read; nothing else to do.
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (open) panelRef.current?.querySelector("textarea")?.focus();
  }, [open]);

  if (!enabled) return null;

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <>
      {opened && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Ask Bonded"
          hidden={!open}
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          className="fixed bottom-20 right-4 z-50 flex h-[min(560px,calc(100dvh-112px))] w-[min(380px,calc(100vw-32px))] flex-col rounded-3xl bg-surface-container-lowest p-4 shadow-2xl ring-1 ring-black/5"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-low"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden>
              close
            </span>
          </button>
          <AssistantPanel
            mode="sales"
            variant="floating"
            title="Questions? Ask us"
            intro="What's in each chapter, who it's for, what you need and the price. Ask in any language."
          />
        </div>
      )}
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        onClick={() => {
          setOpened(true);
          setOpen((v) => !v);
        }}
        className="fixed bottom-4 right-4 z-50 inline-flex h-12 items-center gap-2 rounded-full bg-primary px-5 text-[15px] font-semibold text-white shadow-xl transition hover:bg-primary-dim focus:outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
      >
        <span className="material-symbols-outlined text-[20px]" aria-hidden>
          {open ? "close" : "chat"}
        </span>
        {open ? "Close" : "Questions? Ask us"}
      </button>
    </>
  );
}
