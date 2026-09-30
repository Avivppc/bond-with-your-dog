"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SHOW_MS = 3200;

/**
 * The design's toast for a one-off notice carried in the URL (e.g. ?sent=1 after an action).
 * Render it unconditionally: it picks the message for the parameter's value, removes the
 * parameter (so a reload doesn't repeat it) and stays mounted while the toast shows.
 */
export function UrlToast({ param, messages }: { param: string; messages: Record<string, string> }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [toast, show] = useToast();
  const value = search.get(param);

  useEffect(() => {
    if (!value) return;
    const message = messages[value];
    if (message) show(message);
    const next = new URLSearchParams(search.toString());
    next.delete(param);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // Runs when a new value arrives in the URL; the cleanup replace must not re-trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return toast;
}

/** A toast raised from client code: returns [node, show]. */
export function useToast(): [React.ReactNode, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [message]);
  const node = message ? (
    <div className="toast" role="status">
      {message}
    </div>
  ) : null;
  return [node, setMessage];
}
