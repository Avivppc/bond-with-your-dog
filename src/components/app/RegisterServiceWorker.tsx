"use client";

import { useEffect } from "react";

/** Registers /sw.js in the member app, so the app can be installed and show phone notifications. */
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch((error: unknown) => {
      console.error("[sw] registration failed", error);
    });
  }, []);
  return null;
}
