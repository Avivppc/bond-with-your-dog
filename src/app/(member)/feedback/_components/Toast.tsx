"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SHOW_MS = 3200;

/**
 * The design's toast for a one-off notice carried in the URL (e.g. ?sent=1 after an action).
 * Removes the parameter once shown so a reload doesn't repeat it.
 */
export function UrlToast({ message, param }: { message: string; param: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const next = new URLSearchParams(search.toString());
    next.delete(param);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    const timer = window.setTimeout(() => setOpen(false), SHOW_MS);
    return () => window.clearTimeout(timer);
    // Show once per mount; the URL cleanup must not re-trigger it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;
  return (
    <div className="toast" role="status">
      {message}
    </div>
  );
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
