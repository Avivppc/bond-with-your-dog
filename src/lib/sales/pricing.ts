/**
 * Selling tools (Kajabi parity): coupons, order bumps, after-purchase upsells, gifts and the
 * offer to stay when cancelling. Pure — the checkout, its server actions, the admin and tests
 * share these rules. Amounts are integer cents; discounts round in the buyer's favour.
 */

export interface Coupon {
  id: string;
  code: string;
  percent_off: number | null;
  amount_off_cents: number | null;
  /** Offers it works on; empty = every paid offer. */
  offer_ids: string[];
  max_redemptions: number | null;
  starts_at: string | null;
  expires_at: string | null;
  active: boolean;
}

export type CouponCheck = { ok: true; amountCents: number; label: string } | { ok: false; reason: string };

/** Codes are typed by people: case and spaces don't matter. */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export const COUPON_CODE = /^[A-Z0-9][A-Z0-9_-]{2,39}$/;

/** What a coupon does to an offer's price, or why it can't be used. */
export function applyCoupon(
  coupon: Coupon,
  offer: { id: string; priceCents: number; currency: string; paymentType: string },
  context: { now: Date; redemptions: number; usedByBuyer: boolean },
): CouponCheck {
  if (!coupon.active) return { ok: false, reason: "That code isn't active." };
  if (offer.paymentType === "free") return { ok: false, reason: "This offer is already free." };
  if (coupon.starts_at && new Date(coupon.starts_at) > context.now) return { ok: false, reason: "That code isn't active yet." };
  if (coupon.expires_at && new Date(coupon.expires_at) <= context.now) return { ok: false, reason: "That code has expired." };
  if (coupon.offer_ids.length > 0 && !coupon.offer_ids.includes(offer.id)) return { ok: false, reason: "That code doesn't apply to this offer." };
  if (coupon.max_redemptions !== null && context.redemptions >= coupon.max_redemptions) return { ok: false, reason: "That code has been used up." };
  if (context.usedByBuyer) return { ok: false, reason: "You've already used that code." };

  const off = coupon.percent_off !== null ? Math.ceil((offer.priceCents * coupon.percent_off) / 100) : Math.min(coupon.amount_off_cents ?? 0, offer.priceCents);
  const amountCents = Math.max(0, offer.priceCents - off);
  const label = coupon.percent_off !== null ? `${coupon.percent_off}% off` : `${formatCents(coupon.amount_off_cents ?? 0, offer.currency)} off`;
  return { ok: true, amountCents, label };
}

/** An add-on (order bump) or after-purchase upsell as the admin set it up on an offer. */
export interface AddOnSetup {
  offerId: string | null;
  priceCents: number | null;
}

export interface AddOnOffer {
  id: string;
  status: string;
  paymentType: string;
  priceCents: number;
  currency: string;
}

/**
 * Whether an add-on can be offered with `main`: a published one-time offer in the same currency,
 * at a price above zero that isn't more than its own price, and not the main offer itself.
 */
export function addOnUsable(setup: AddOnSetup, addOn: AddOnOffer | null, main: { id: string; currency: string }): boolean {
  if (!setup.offerId || !addOn || setup.priceCents === null) return false;
  return (
    addOn.id !== main.id &&
    addOn.status === "published" &&
    addOn.paymentType === "one_time" &&
    addOn.currency === main.currency &&
    setup.priceCents > 0 &&
    setup.priceCents <= addOn.priceCents
  );
}

export type DiscountKind = "friend" | "reward" | "upsell" | "coupon" | "post_purchase";

/** A discount the buyer qualifies for, priced. */
export interface DiscountCandidate {
  kind: DiscountKind;
  amountCents: number;
}

/**
 * One discount per purchase: an after-purchase upsell price stands alone; otherwise the cheapest
 * wins, and on a tie a personal code, then a coupon, then a referral discount.
 */
export function bestDiscount<T extends DiscountCandidate>(candidates: readonly (T | null)[]): T | null {
  const present = candidates.filter((c): c is T => c !== null);
  const postPurchase = present.find((c) => c.kind === "post_purchase");
  if (postPurchase) return postPurchase;
  const rank: Record<DiscountKind, number> = { upsell: 0, coupon: 1, friend: 2, reward: 2, post_purchase: 3 };
  return [...present].sort((a, b) => a.amountCents - b.amountCents || rank[a.kind] - rank[b.kind])[0] ?? null;
}

/** The percentage a discount represents (for reports), whole and between 0 and 100. */
export function effectivePercent(listCents: number, paidCents: number): number {
  if (listCents <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round(((listCents - paidCents) / listCents) * 100)));
}

/** The amount charged: the (possibly discounted) main price plus an accepted bump. */
export function orderTotal(mainCents: number, bumpCents: number | null): number {
  return mainCents + (bumpCents ?? 0);
}

/** After-purchase upsells stay open this long after the first purchase. */
export const UPSELL_WINDOW_HOURS = 48;

export function upsellStillOpen(paidAt: string | null, now: Date): boolean {
  if (!paidAt) return false;
  return now.getTime() - new Date(paidAt).getTime() <= UPSELL_WINDOW_HOURS * 3_600_000;
}

/** The offer to stay when cancelling a subscription: a % off for a number of payments. */
export function retentionLabel(percent: number, cycles: number, interval: "month" | "year" | null): string {
  const unit = interval === "year" ? "year" : "month";
  return cycles === 1 ? `${percent}% off your next ${unit}` : `${percent}% off your next ${cycles} ${unit}s`;
}

export function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GIFT_NAME = /^[\p{L}\p{M}][\p{L}\p{M}' .-]{0,59}$/u;

export interface GiftInput {
  recipientEmail: string;
  recipientName: string;
  message: string;
}

/** A gift's recipient details, or why they can't be used (a name can't carry a link; message is plain text). */
export function checkGift(input: GiftInput, buyerEmail: string): { ok: true; gift: GiftInput } | { ok: false; reason: string } {
  const recipientEmail = input.recipientEmail.trim().toLowerCase();
  const recipientName = input.recipientName.trim();
  const message = input.message.trim();
  if (!EMAIL.test(recipientEmail) || recipientEmail.length > 254) return { ok: false, reason: "Enter the recipient's email address." };
  if (recipientEmail === buyerEmail.trim().toLowerCase()) return { ok: false, reason: "A gift goes to someone else. To buy it for yourself, untick “This is a gift”." };
  if (!GIFT_NAME.test(recipientName)) return { ok: false, reason: "Enter the recipient's first name." };
  if (message.length > 500) return { ok: false, reason: "Keep the message under 500 characters." };
  if (/https?:\/\/|www\./i.test(message)) return { ok: false, reason: "The message can't include links." };
  return { ok: true, gift: { recipientEmail, recipientName, message } };
}
