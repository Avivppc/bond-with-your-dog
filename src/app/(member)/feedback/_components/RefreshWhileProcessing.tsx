"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const EVERY_MS = 8000;
const MAX_TRIES = 15;

/** While a video is still processing, re-render the page every few seconds (for about two minutes). */
export function RefreshWhileProcessing({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (tries > MAX_TRIES) window.clearInterval(timer);
      else router.refresh();
    }, EVERY_MS);
    return () => window.clearInterval(timer);
  }, [active, router]);
  return null;
}
