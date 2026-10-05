/**
 * Affiliate program rules (Kajabi parity), separate from "refer a friend": partners share
 * bonded.dog/a/<code> and earn a commission in money on purchases made within 30 days. Pure.
 */

import { COUPON_CODE, normalizeCode, PERSONAL_CODE } from "../sales/pricing";

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

/** "dana-levi" with 10% off → "DANALEVI10" (a starting point; the affiliate picks their own). */
export function suggestCouponCode(affiliateCode: string, percent: number): string {
  return `${affiliateCode.replace(/-/g, "").toUpperCase().slice(0, 36)}${percent}`;
}

/** The discount code an affiliate types for themselves, as stored (upper-case, no spaces). */
export function checkAffiliateCouponCode(raw: string): { ok: true; code: string } | { ok: false; reason: string } {
  const code = normalizeCode(raw);
  if (!COUPON_CODE.test(code)) return { ok: false, reason: "Use 3–40 letters and numbers (dashes are fine), starting with a letter or number." };
  if (PERSONAL_CODE.test(code)) return { ok: false, reason: "Codes can't start with BOND-. Try another one." };
  return { ok: true, code };
}

interface CouponSetting {
  active: boolean;
  coupon_percent: number | null;
}

/**
 * What saving an affiliate does to their code: off when they're paused or have no discount, on
 * again only when they come back, otherwise just the discount (a code the team switched off in
 * Coupons stays off).
 */
export function affiliateCouponPatch(before: CouponSetting, after: CouponSetting): { percent_off?: number; active?: boolean } {
  if (!after.coupon_percent) return { active: false };
  if (!after.active) return { percent_off: after.coupon_percent, active: false };
  const cameBack = !before.active || !before.coupon_percent;
  return cameBack ? { percent_off: after.coupon_percent, active: true } : { percent_off: after.coupon_percent };
}

const FALLBACK = "/courses";
const PROBE = "http://landing.invalid";

/**
 * Where an affiliate link may send people: a path on our own site, never another site. Browsers
 * drop tabs and newlines before parsing (so "/\t/evil.com" would become "//evil.com"); anything with
 * control characters is refused, and the parsed result must stay on our origin.
 */
export function safeLandingPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(raw)) return FALLBACK;
  try {
    const url = new URL(raw, PROBE);
    if (url.origin !== PROBE) return FALLBACK;
    return `${url.pathname}${url.search}`.slice(0, 200);
  } catch {
    return FALLBACK;
  }
}

/** The commission on what was paid (tax excluded), rounded down to the cent. */
export function commissionCents(baseCents: number, percent: number): number {
  return Math.max(0, Math.floor((baseCents * percent) / 100));
}

/** An affiliate never earns on their own purchases. */
export function isOwnPurchase(affiliate: { user_id: string | null; email: string }, buyer: { id: string; email: string }): boolean {
  return affiliate.user_id === buyer.id || affiliate.email.trim().toLowerCase() === buyer.email.trim().toLowerCase();
}
