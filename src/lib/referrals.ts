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

export function discountedCents(priceCents: number, percent: number): number {
  return Math.round(priceCents * (1 - percent / 100));
}

/** Codes are generated lowercase alphanumerics (see get_or_create_referral_code). */
export function isValidReferralCode(code: string): boolean {
  return /^[a-z0-9]{6,16}$/.test(code);
}

export const REFERRAL_COOKIE = "bonded_ref";
