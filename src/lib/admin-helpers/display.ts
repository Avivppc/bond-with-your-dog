import { TIER_LABELS, type Tier } from "../quiz/data";

/** Small display helpers for admin screens. Pure. */

/** First letter upper-cased ("or" → "Or"); the rest stays as typed. */
export function capitalizeFirst(value: string): string {
  return value ? value.charAt(0).toLocaleUpperCase("en-US") + value.slice(1) : value;
}

/** The greeting name: first word of the full name, else the email's local part, else "there". */
export function displayFirstName(fullName: string | null | undefined, email: string | null | undefined): string {
  const first = fullName?.trim().split(/\s+/)[0] || email?.split("@")[0]?.trim() || "";
  return first ? capitalizeFirst(first) : "there";
}

/** Quiz result shown to staff ("letsDance" → "Bonded: Let's Dance"); unknown values as stored. */
export function leadTierLabel(tier: string): string {
  return Object.hasOwn(TIER_LABELS, tier) ? TIER_LABELS[tier as Tier] : tier;
}
