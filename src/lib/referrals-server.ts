import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import { chooseDiscount, discountedCents, heldDiscounts, isValidReferralCode, type CheckoutDiscount, type PendingDiscountOrder } from "./referrals";
import { EVENTS, trackMember } from "@/lib/analytics-server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export interface ReferralSettings {
  enabled: boolean;
  friendDiscountPercent: number;
  friendPaddleDiscountId: string | null;
  rewardPercent: number;
  rewardPaddleDiscountId: string | null;
  attributionDays: number;
  description: string | null;
}

/** Results after which the referral cookie has done its job. */
const FINAL_CLAIM_RESULTS = new Set(["ok", "invalid", "self", "already", "existing_customer"]);

export async function loadReferralSettings(): Promise<ReferralSettings> {
  const { data, error } = await createServiceClient().from("referral_settings").select("*").eq("id", 1).maybeSingle();
  if (error) console.error("[referrals] settings load failed", error.message);
  return {
    enabled: Boolean(data?.enabled),
    friendDiscountPercent: Number(data?.friend_discount_percent ?? 0),
    friendPaddleDiscountId: data?.friend_paddle_discount_id ?? null,
    rewardPercent: Number(data?.reward_percent ?? 0),
    rewardPaddleDiscountId: data?.reward_paddle_discount_id ?? null,
    attributionDays: Number(data?.attribution_days ?? 30),
    description: data?.description ?? null,
  };
}

/**
 * Attributes the signed-in user to the code in the referral cookie (set by /r/<code>).
 * Returns true when the cookie should be cleared. Call from route handlers / server actions.
 */
export async function claimReferralCode(supabase: ServerSupabase, code: string | undefined): Promise<boolean> {
  if (!code || !isValidReferralCode(code)) return Boolean(code);
  const { data, error } = await supabase.rpc("claim_referral", { p_code: code });
  if (error) {
    console.error("[referrals] claim failed", error.message);
    return false;
  }
  if (String(data) === "ok") {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // A member is referred once, so their id keeps a repeated claim to one event.
    if (user) trackMember(user, EVENTS.referralSignup, {}, { dedupeKey: user.id });
  }
  return FINAL_CLAIM_RESULTS.has(String(data));
}

export interface ReferralQuote {
  discount: CheckoutDiscount | null;
  /** Price after the discount (what the test provider charges; Paddle reports the real amount). */
  amountCents: number;
  /** Paddle discount to attach to the transaction. */
  paddleDiscountId: string | null;
}

/**
 * The referral discount a buyer gets on a paid offer: a referred friend's first-purchase discount
 * or the buyer's own referrer reward — never both. With Paddle, a discount only applies when its
 * Paddle discount id is configured (otherwise the buyer pays full price and nothing is consumed).
 */
export async function referralQuote({
  userId,
  offerId,
  priceCents,
  provider,
}: {
  userId: string;
  offerId: string;
  priceCents: number;
  provider: string | null;
}): Promise<ReferralQuote> {
  const none: ReferralQuote = { discount: null, amountCents: priceCents, paddleDiscountId: null };
  if (priceCents <= 0) return none;
  const settings = await loadReferralSettings();
  if (!settings.enabled) return none;

  const sb = createServiceClient();
  const nowMs = Date.now();
  const windowStart = new Date(nowMs - settings.attributionDays * 86_400_000).toISOString();
  const [referralRes, rewardRes, pendingRes] = await Promise.all([
    sb.from("referrals").select("id").eq("friend_id", userId).eq("status", "signed_up").gte("created_at", windowStart).maybeSingle(),
    sb.from("referral_rewards").select("id, percent").eq("user_id", userId).eq("status", "available").order("percent", { ascending: false }),
    sb.from("orders").select("offer_id, discount_kind, referral_reward_id, created_at").eq("user_id", userId).eq("status", "pending").not("discount_kind", "is", null),
  ]);
  if (pendingRes.error) {
    // Without knowing what other checkouts hold, don't hand out a discount twice.
    console.error("[referrals] pending orders lookup failed", pendingRes.error.message);
    return none;
  }
  const held = heldDiscounts((pendingRes.data ?? []) as PendingDiscountOrder[], offerId, nowMs);

  const paddle = provider === "paddle";
  const friendPercent = referralRes.data && !held.friend && (!paddle || settings.friendPaddleDiscountId) ? settings.friendDiscountPercent : null;
  const best = (rewardRes.data ?? []).find((r) => !held.rewardIds.has(r.id));
  const reward = best && (!paddle || settings.rewardPaddleDiscountId) ? { id: best.id, percent: best.percent } : null;
  const discount = chooseDiscount({ friendPercent, reward });
  if (!discount) return none;
  return {
    discount,
    amountCents: discountedCents(priceCents, discount.percent),
    paddleDiscountId: paddle ? (discount.kind === "friend" ? settings.friendPaddleDiscountId : settings.rewardPaddleDiscountId) : null,
  };
}
