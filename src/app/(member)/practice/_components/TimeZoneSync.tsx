"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TZ_COOKIE, TZ_COOKIE_MAX_AGE } from "@/lib/practice/zone-cookie";

function readCookie(name: string): string | null {
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

/**
 * Tells the server the viewer's time zone (a cookie) so "today", the week strip and the month
 * calendar match the member's own calendar. Re-renders once when it changes.
 */
export function TimeZoneSync() {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || readCookie(TZ_COOKIE) === tz) return;
    document.cookie = `${TZ_COOKIE}=${encodeURIComponent(tz)}; path=/; max-age=${TZ_COOKIE_MAX_AGE}; samesite=lax`;
    router.refresh();
  }, [router]);
  return null;
}
