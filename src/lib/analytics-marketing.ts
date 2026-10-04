import { EVENTS, isEnabled, setPersonProperties, track, type EventProps } from "./analytics";

/** A member's marketing-email answer, as stored on their profile. */
export interface MarketingConsentState {
  optIn: boolean;
  optInAt: string | null;
  source: string | null;
  country: string | null;
  prechecked: boolean | null;
}

/** Person properties in PostHog: who agreed to marketing email, and the proof. */
export function marketingPersonProps(state: MarketingConsentState): EventProps {
  return {
    marketing_opt_in: state.optIn,
    marketing_opt_in_at: state.optInAt,
    marketing_opt_in_source: state.source,
    marketing_opt_in_country: state.country,
    marketing_opt_in_prechecked: state.prechecked,
  };
}

/** What this browser last reported, so a page load only talks to PostHog when the answer changed. */
const LAST_REPORTED_KEY = "bonded_marketing_consent_reported";

interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function readLastReported(store: KeyValueStore): string | null {
  try {
    return store.getItem(LAST_REPORTED_KEY);
  } catch {
    return null;
  }
}

function writeLastReported(store: KeyValueStore, value: string): void {
  try {
    store.setItem(LAST_REPORTED_KEY, value);
  } catch {
    // Storage blocked (private window): the next page load just reports again.
  }
}

function changeEventProps(state: MarketingConsentState): EventProps {
  if (!state.optIn) return { granted: false };
  return { granted: true, source: state.source, country: state.country, prechecked: state.prechecked };
}

/**
 * Puts the member's answer on their PostHog person. Idempotent: the same answer for the same member
 * is reported once per browser. `announceChange` also records the moment the answer changed; pass it
 * only when the member just changed it (Settings), never on a page load, where a new device or a
 * cleared browser would look like a change.
 */
export function syncMarketingConsent(
  userId: string,
  state: MarketingConsentState,
  store: KeyValueStore,
  announceChange: boolean,
): void {
  // Nothing is sent without PostHog, so nothing may be remembered as sent either.
  if (!isEnabled()) return;
  const fingerprint = `${userId}:${state.optIn}:${state.optInAt ?? ""}`;
  if (readLastReported(store) === fingerprint) return;
  setPersonProperties(marketingPersonProps(state));
  if (announceChange) track(EVENTS.marketingConsentChanged, changeEventProps(state));
  writeLastReported(store, fingerprint);
}
