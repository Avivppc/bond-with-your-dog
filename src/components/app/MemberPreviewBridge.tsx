"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PREVIEW_MESSAGES } from "@/lib/site/preview-messages";

const subscribe = () => () => {};

/**
 * Shown while a staff member previews the member area draft: refreshes when the editor saves, and
 * (outside the editor) a badge with a way out of the preview.
 */
export function MemberPreviewBridge() {
  const router = useRouter();
  const pathname = usePathname();
  const inEditor = useSyncExternalStore(subscribe, () => window.parent !== window, () => true);

  useEffect(() => {
    const origin = window.location.origin;
    function onMessage(e: MessageEvent) {
      if (e.origin !== origin || e.source !== window.parent) return;
      if ((e.data as { type?: string })?.type === PREVIEW_MESSAGES.refresh) router.refresh();
    }
    window.addEventListener("message", onMessage);
    if (window.parent !== window) window.parent.postMessage({ type: PREVIEW_MESSAGES.ready }, origin);
    return () => window.removeEventListener("message", onMessage);
  }, [router]);

  if (inEditor) return null;
  return (
    <a
      href={`/site-editor/member/preview?off=1&to=${encodeURIComponent(pathname)}`}
      style={{ position: "fixed", bottom: 90, right: 16, zIndex: 60, background: "#1d4f91", color: "#fff", borderRadius: 999, padding: "8px 14px", fontSize: 13, fontWeight: 600, boxShadow: "0 6px 20px rgba(0,0,0,.2)" }}
    >
      Draft preview · Exit
    </a>
  );
}
