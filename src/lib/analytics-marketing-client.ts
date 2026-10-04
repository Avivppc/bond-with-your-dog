import { createClient } from "@/lib/supabase/client";
import { syncMarketingConsent, type MarketingConsentState } from "./analytics-marketing";

const PROFILE_COLUMNS =
  "marketing_opt_in, marketing_opt_in_at, marketing_opt_in_source, marketing_opt_in_country, marketing_opt_in_prechecked";

/** Narrows the profile row without trusting its shape. */
function readState(row: Record<string, unknown>): MarketingConsentState {
  const text = (value: unknown): string | null => (typeof value === "string" ? value : null);
  return {
    optIn: row.marketing_opt_in === true,
    optInAt: text(row.marketing_opt_in_at),
    source: text(row.marketing_opt_in_source),
    country: text(row.marketing_opt_in_country),
    prechecked: typeof row.marketing_opt_in_prechecked === "boolean" ? row.marketing_opt_in_prechecked : null,
  };
}

/**
 * Reads the signed-in member's marketing answer from their profile and puts it on their PostHog
 * person (`announceChange`: the member just changed it, see syncMarketingConsent). Browser only. Failures are logged, never shown: analytics must not get in the way.
 */
export async function reportMarketingConsent(announceChange: boolean): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const { data, error } = await supabase.from("profiles").select(PROFILE_COLUMNS).eq("id", session.user.id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return;
    syncMarketingConsent(session.user.id, readState(data as Record<string, unknown>), window.localStorage, announceChange);
  } catch (error: unknown) {
    console.error("[analytics] marketing consent was not reported", error instanceof Error ? error.message : error);
  }
}
