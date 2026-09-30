/**
 * "Friend brings friend" referral rules that don't need the database (shared with the app).
 * The database (supabase/migrations/…_referrals.sql) decides eligibility and issues rewards.
 */
export interface CheckoutDiscount {
  kind: "friend" | "reward";
  percent: number;
  /** The referrer reward consumed by this purchase (kind "reward"). */
  rewardId: string | null;
}

interface DiscountOptions {
  /** Percent off for a referred friend's first purchase, or null when they don't qualify. */
  friendPercent: number | null;
  /** The buyer's best unused referrer reward, if any. */
  reward: { id: string; percent: number } | null;
}

/** One discount per purchase: the larger one; on a tie the friend discount, so the reward is kept. */
export function chooseDiscount({ friendPercent, reward }: DiscountOptions): CheckoutDiscount | null {
  const friend = friendPercent && friendPercent > 0 ? friendPercent : 0;
  const rewardPercent = reward && reward.percent > 0 ? reward.percent : 0;
  if (!friend && !rewardPercent) return null;
  if (rewardPercent > friend && reward) return { kind: "reward", percent: rewardPercent, rewardId: reward.id };
  return { kind: "friend", percent: friend, rewardId: null };
}

/** How long an unpaid checkout keeps its referral discount to itself (then it's free for a new checkout). */
export const DISCOUNT_HOLD_HOURS = 24;

export interface PendingDiscountOrder {
  offer_id: string;
  discount_kind: "friend" | "reward" | null;
  referral_reward_id: string | null;
  created_at: string;
}

/**
 * Discounts are only consumed when a payment arrives, so an unpaid checkout for a different offer
 * "holds" its discount: otherwise opening several checkouts before paying would apply a friend's
 * first-purchase discount (or a single reward) to all of them. A retry of the same offer doesn't
 * hold anything — that's the same purchase — and a hold lapses after DISCOUNT_HOLD_HOURS.
 */
export function heldDiscounts(pending: PendingDiscountOrder[], offerId: string, nowMs: number): { friend: boolean; rewardIds: Set<string> } {
  const cutoff = nowMs - DISCOUNT_HOLD_HOURS * 3_600_000;
  const holding = pending.filter((o) => o.offer_id !== offerId && Date.parse(o.created_at) >= cutoff);
  return {
    friend: holding.some((o) => o.discount_kind === "friend"),
    rewardIds: new Set(holding.flatMap((o) => (o.discount_kind === "reward" && o.referral_reward_id ? [o.referral_reward_id] : []))),
  };
}

export function discountedCents(priceCents: number, percent: number): number {
  return Math.round(priceCents * (1 - percent / 100));
}

/** Codes are generated lowercase alphanumerics (see get_or_create_referral_code). */
export function isValidReferralCode(code: string): boolean {
  return /^[a-z0-9]{6,16}$/.test(code);
}

export const REFERRAL_COOKIE = "bonded_ref";
