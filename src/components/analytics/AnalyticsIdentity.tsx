"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { identifyByEmail } from "@/lib/analytics";

/**
 * Ties the PostHog person to the signed-in member. onAuthStateChange replays
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
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}
