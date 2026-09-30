"use client";

import { useEffect, useRef, useState } from "react";

interface ActionMenuProps {
  /** Accessible name for the trigger, e.g. "Actions for Welcome". */
  label: string;
  trigger: React.ReactNode;
  triggerClassName?: string;
  /** Receives `close` so items can dismiss the menu after acting. */
  children: (close: () => void) => React.ReactNode;
}

/** Room the menu needs below the trigger before it opens upwards instead. */
const MENU_ROOM_PX = 240;

type Placement = { top: number; right: number } | { bottom: number; right: number };

/**
 * Small popover menu (⋯ / "+ Add content"). Rendered with position:fixed next to its trigger so
 * rounded/overflow-clipped containers (the outline box) can't cut it off; closes on outside click,
 * Escape, scroll/resize, or after an item acts.
 */
export function ActionMenu({ label, trigger, triggerClassName = "", children }: ActionMenuProps) {
  const [place, setPlace] = useState<Placement | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const close = () => setPlace(null);

  function toggle() {
    if (place || !button.current) {
      close();
      return;
    }
    const r = button.current.getBoundingClientRect();
    const right = window.innerWidth - r.right;
    setPlace(window.innerHeight - r.bottom < MENU_ROOM_PX ? { bottom: window.innerHeight - r.top + 4, right } : { top: r.bottom + 4, right });
  }

  useEffect(() => {
    if (!place) return;
    const onPointer = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setPlace(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPlace(null);
    const onMove = () => setPlace(null);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [place]);

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={Boolean(place)}
        onClick={toggle}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {place && (
        <div role="menu" style={{ position: "fixed", ...place }} className="z-50 min-w-48 rounded-[12px] border border-[#e7e6e4] bg-white p-1 text-sm shadow-lg">
          {children(close)}
        </div>
      )}
    </div>
  );
}

export const MENU_ITEM = "flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-sm text-[#1a1a19] hover:bg-[#f3f3f2]";
