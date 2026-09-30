"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const MAX_ATTEMPTS = 40; // ~2 minutes at 3s

/** Re-renders the server page until the webhook marks the order paid. */
export function AutoRefresh({ everyMs }: { everyMs: number }) {
  const router = useRouter();
  useEffect(() => {
    let attempts = 0;
    const id = window.setInterval(() => {
      attempts += 1;
      if (attempts > MAX_ATTEMPTS) window.clearInterval(id);
      else router.refresh();
    }, everyMs);
    return () => window.clearInterval(id);
  }, [router, everyMs]);
  return null;
}
