import { PRETICK_COUNTRIES } from "./marketing-regions";

/** Short-lived cookie that carries the newsletter checkbox through the Google OAuth redirect. */
export const MARKETING_CONSENT_COOKIE = "bonded_marketing_opt_in";

export const MARKETING_CONSENT_LABEL =
  "Email me Roni's training tips and updates.";

/** Where a member said yes (profiles.marketing_opt_in_source). */
export type MarketingConsentSource = "signup_form" | "signup_google" | "settings";

/** The country Vercel's edge puts on every request. Absent in local dev. */
const COUNTRY_HEADER = "x-vercel-ip-country";

const COUNTRY_CODE = /^[A-Z]{2}$/;

/** An ISO 3166-1 alpha-2 code in upper case, or null for anything else (Vercel sends "XX"-style codes for unknowns). */
export function normalizeCountry(raw: string | null | undefined): string | null {
  const code = raw?.trim().toUpperCase() ?? "";
  return COUNTRY_CODE.test(code) ? code : null;
}

export function requestCountry(requestHeaders: Headers): string | null {
  return normalizeCountry(requestHeaders.get(COUNTRY_HEADER));
}

/**
 * Whether the marketing box may start ticked for this visitor. Only a country on the verified
 * opt-out list qualifies, so an unknown country (or a missing header) never pre-ticks.
 */
export function marketingPreTickAllowed(country: string | null | undefined): boolean {
  const code = normalizeCountry(country);
  return code !== null && PRETICK_COUNTRIES.has(code);
}

/** The proof stored next to a "yes" (profiles.marketing_opt_in_* columns). */
export interface ConsentEvidence {
  marketing_opt_in_source: MarketingConsentSource;
  marketing_opt_in_country: string | null;
  /** The box came ticked, so the person left it on instead of ticking it themselves. */
  marketing_opt_in_prechecked: boolean;
}

export function consentEvidence(source: MarketingConsentSource, country: string | null | undefined): ConsentEvidence {
  return {
    marketing_opt_in_source: source,
    marketing_opt_in_country: normalizeCountry(country),
    // Settings has no pre-ticked box; both sign-up routes show the same box.
    marketing_opt_in_prechecked: source !== "settings" && marketingPreTickAllowed(country),
  };
}

/** A brand-new account has its first sign-in within this long of being created. */
const FRESH_ACCOUNT_WINDOW_MS = 60_000;

interface SignInFacts {
  provider: string | undefined;
  createdAt: string | undefined;
  lastSignInAt: string | undefined;
}

/**
 * Whether this Google sign-in just created the account. Only then may the sign-up box's cookie
 * record consent: an existing member signing in through the same button must never be opted back in.
 */
export function isFreshGoogleSignup({ provider, createdAt, lastSignInAt }: SignInFacts): boolean {
  if (provider !== "google" || !createdAt || !lastSignInAt) return false;
  const gap = Date.parse(lastSignInAt) - Date.parse(createdAt);
  return Number.isFinite(gap) && gap >= 0 && gap <= FRESH_ACCOUNT_WINDOW_MS;
}
