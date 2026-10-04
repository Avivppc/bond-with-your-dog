/**
 * Affiliate program rules (Kajabi parity), separate from "refer a friend": partners share
 * bonded.dog/a/<code> and earn a commission in money on purchases made within 30 days. Pure.
 */

export const AFFILIATE_COOKIE = "bonded_aff";
export const AFFILIATE_COOKIE_DAYS = 30;

export const AFFILIATE_CODE = /^[a-z0-9][a-z0-9-]{2,29}$/;

export function isAffiliateCode(raw: string): boolean {
  return AFFILIATE_CODE.test(raw);
}

/** "Dana Levi" → "dana-levi" (a starting point; the team can change it). */
export function suggestAffiliateCode(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/, "");
  return slug.length >= 3 ? slug : `${slug}-partner`.replace(/^-/, "");
}

/** Where an affiliate link may send people: a path on our own site, never another site. */
export function safeLandingPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return "/courses";
  return raw.slice(0, 200);
}

/** The commission on what was paid (tax excluded), rounded down to the cent. */
export function commissionCents(baseCents: number, percent: number): number {
  return Math.max(0, Math.floor((baseCents * percent) / 100));
}

/** An affiliate never earns on their own purchases. */
export function isOwnPurchase(affiliate: { user_id: string | null; email: string }, buyer: { id: string; email: string }): boolean {
  return affiliate.user_id === buyer.id || affiliate.email.trim().toLowerCase() === buyer.email.trim().toLowerCase();
}
