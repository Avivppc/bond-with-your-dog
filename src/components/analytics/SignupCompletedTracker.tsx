"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { EVENTS, track } from "@/lib/analytics";
import { SIGNUP_COMPLETED_COOKIE, readSignupMarker } from "@/lib/signup-marker";

/** Sends signup_completed once after a signup redirect (see lib/signup-marker). */
export default function SignupCompletedTracker() {
  // Server-action redirects keep the root layout mounted, so re-check on every route change.
  const pathname = usePathname();

  useEffect(() => {
    const method = readSignupMarker(document.cookie);
    if (!method) return;
    document.cookie = `${SIGNUP_COMPLETED_COOKIE}=; Max-Age=0; path=/`;
    track(EVENTS.signupCompleted, { method });
  }, [pathname]);

  return null;
}
