"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { identifyByEmail } from "@/lib/analytics";
import { reportMarketingConsent } from "@/lib/analytics-marketing-client";

/** One profile read per browser tab session; changes made in Settings are reported straight away. */
const CHECKED_KEY = "bonded_marketing_consent_checked";

function shouldCheckMarketingConsent(userId: string): boolean {
  try {
    if (window.sessionStorage.getItem(CHECKED_KEY) === userId) return false;
    window.sessionStorage.setItem(CHECKED_KEY, userId);
  } catch {
    // Storage blocked: check on every page rather than never.
  }
  return true;
}

/**
 * Ties the PostHog person to the signed-in member and records their marketing-email answer on it. onAuthStateChange replays
 * the stored session as INITIAL_SESSION, so no extra auth round trip is made.
 */
export default function AnalyticsIdentity() {
  useEffect(() => {
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (!user?.email) return;
      identifyByEmail(user.email, {
        name: (user.user_metadata?.full_name as string | undefined) ?? null,
        supabase_user_id: user.id,
      });
      if (shouldCheckMarketingConsent(user.id)) void reportMarketingConsent(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}
