"use client";

import { useEffect } from "react";
import { rememberTimeZone } from "@/app/(member)/actions";

/**
 * Rendered only while the member's profile has no time zone: reports the browser's zone once so
 * reminders arrive on the member's own days. Renders nothing.
 */
export function TimeZoneCapture() {
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone) return;
    rememberTimeZone(zone).catch((error: unknown) => {
      console.error("[member] time zone report failed", error instanceof Error ? error.message : error);
    });
  }, []);
  return null;
}
