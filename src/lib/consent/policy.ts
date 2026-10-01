/**
 * Cookie consent rules, shared by the proxy (which knows the country), the
 * PostHog init and the banner. No framework imports so it runs anywhere.
 *
 * - opt_in:  the law asks for consent first. Show the banner; until the visitor
 *            accepts, PostHog counts them cookielessly (no cookies, no identity).
 * - opt_out: analytics starts on, and "Cookie settings" in the footer turns it off.
 */
export type ConsentPolicy = "opt_in" | "opt_out";
export type AnalyticsDecision = "granted" | "denied" | "undecided";

/** The consent library's cookie: the visitor's choice. */
export const CONSENT_COOKIE = "bonded_consent";
/** Set by the proxy from the visitor's country: which policy applies. */
export const REGION_COOKIE = "bonded_consent_region";
export const ANALYTICS_CATEGORY = "analytics";
/** Bump when the cookie policy changes in a way people must agree to again. */
export const CONSENT_REVISION = 1;

const EEA = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "IS", "LI", "NO",
];

/** GDPR (EEA), UK GDPR, Swiss FADP and Brazil's LGPD all expect consent before analytics cookies. */
const OPT_IN_COUNTRIES: ReadonlySet<string> = new Set([...EEA, "GB", "CH", "BR"]);

export function policyForCountry(country: string | null | undefined): ConsentPolicy {
  if (!country) return "opt_in";
  return OPT_IN_COUNTRIES.has(country.toUpperCase()) ? "opt_in" : "opt_out";
}

export function parsePolicy(value: string | undefined): ConsentPolicy {
  return value === "opt_out" ? "opt_out" : "opt_in";
}

export function readCookie(cookieHeader: string, name: string): string | undefined {
  const prefix = `${name}=`;
  const match = cookieHeader.split(/;\s*/).find((part) => part.startsWith(prefix));
  return match?.slice(prefix.length);
}

export interface StoredConsent {
  categories: string[];
  revision: number;
  consentId: string;
}

function isStoredConsent(value: unknown): value is StoredConsent {
  if (typeof value !== "object" || value === null) return false;
  const { categories, revision, consentId } = value as Record<string, unknown>;
  return (
    Array.isArray(categories) &&
    categories.every((c) => typeof c === "string") &&
    typeof revision === "number" &&
    typeof consentId === "string"
  );
}

/** Reads the cookie vanilla-cookieconsent writes (URI-encoded JSON). */
export function readStoredConsent(raw: string | undefined): StoredConsent | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(decodeURIComponent(raw));
    if (!isStoredConsent(value)) return null;
    return { categories: value.categories, revision: value.revision, consentId: value.consentId };
  } catch {
    return null;
  }
}

/**
 * @param gpc Global Privacy Control: a browser-wide "do not sell or share" signal that
 *   California (CPRA) and other US states require sites to honour as an opt-out.
 */
export function analyticsDecision(
  policy: ConsentPolicy,
  stored: StoredConsent | null,
  gpc = false,
): AnalyticsDecision {
  if (stored && stored.revision === CONSENT_REVISION) {
    return stored.categories.includes(ANALYTICS_CATEGORY) ? "granted" : "denied";
  }
  if (gpc) return "denied";
  return policy === "opt_out" ? "granted" : "undecided";
}

/** The browser's Global Privacy Control flag (not yet in the DOM typings). */
export function browserSendsGpc(): boolean {
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
}

/** Decision for the current page, from the two cookies and GPC. Browser only. */
export function currentAnalyticsDecision(): AnalyticsDecision {
  const cookies = document.cookie;
  return analyticsDecision(
    parsePolicy(readCookie(cookies, REGION_COOKIE)),
    readStoredConsent(readCookie(cookies, CONSENT_COOKIE)),
    browserSendsGpc(),
  );
}

export function currentPolicy(): ConsentPolicy {
  return parsePolicy(readCookie(document.cookie, REGION_COOKIE));
}
