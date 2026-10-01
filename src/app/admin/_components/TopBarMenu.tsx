"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

interface TopBarMenuProps {
  label: string;
  summaryClassName: string;
  /** The button face (icon, avatar…). */
  trigger: React.ReactNode;
  panelClassName: string;
  children: React.ReactNode;
}

/**
 * A <details> dropdown for the admin top bar that also closes on an outside click, after a
 * link inside it is followed, and when the page changes (the layout, and so the menu, persists).
 */
export function TopBarMenu({ label, summaryClassName, trigger, panelClassName, children }: TopBarMenuProps) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const menu = ref.current;
      if (menu?.open && e.target instanceof Node && !menu.contains(e.target)) menu.open = false;
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <details ref={ref} className="relative">
      <summary className={summaryClassName} aria-label={label}>
        {trigger}
      </summary>
      <div
        className={panelClassName}
        onClick={(e) => {
          if (e.target instanceof Element && e.target.closest("a") && ref.current) ref.current.open = false;
        }}
      >
        {children}
      </div>
    </details>
  );
}
