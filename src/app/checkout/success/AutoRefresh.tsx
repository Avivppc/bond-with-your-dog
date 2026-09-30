"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_ATTEMPTS = 40; // ~2 minutes at 3s

/**
 * Re-renders the server page until the webhook marks the order paid. If confirmation
 * takes longer than the polling window, tells the buyer what to do instead of spinning forever.
 */
export function AutoRefresh({ everyMs }: { everyMs: number }) {
  const router = useRouter();
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    let attempts = 0;
    const id = window.setInterval(() => {
      attempts += 1;
      if (attempts > MAX_ATTEMPTS) {
        window.clearInterval(id);
        setGaveUp(true);
      } else {
        router.refresh();
      }
    }, everyMs);
    return () => window.clearInterval(id);
  }, [router, everyMs]);

  if (!gaveUp) return null;
  return (
    <p role="status" className="mt-4 text-sm text-slate-600">
      Confirmation is taking longer than usual. Your payment is safe — access usually appears within a few minutes. Refresh this page
      later or check your dashboard; if it still isn&apos;t there, reply to your receipt email and we&apos;ll sort it out.
    </p>
  );
}
