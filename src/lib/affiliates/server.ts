import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmail, siteUrl } from "@/lib/email";
import { affiliateCouponPatch, commissionCents, isAffiliateCode, isOwnPurchase } from "./rules";

export interface Affiliate {
  id: string;
  name: string;
  email: string;
  user_id: string | null;
  code: string;
  commission_percent: number;
  /** What their own discount code takes off (null = no code for them). */
  coupon_percent: number | null;
  active: boolean;
  note: string | null;
  created_at: string;
}

export const AFFILIATE_COLUMNS = "id, name, email, user_id, code, commission_percent, coupon_percent, active, note, created_at";

export interface AffiliateCoupon {
  id: string;
  code: string;
  percent_off: number | null;
  active: boolean;
  uses: number;
}

/** The affiliate's own discount code and how many paid purchases used it, if they made one. */
export async function loadAffiliateCoupon(affiliateId: string): Promise<AffiliateCoupon | null> {
  const sb = createServiceClient();
  const { data, error } = await sb.from("coupons").select("id, code, percent_off, active").eq("affiliate_id", affiliateId).maybeSingle();
  if (error) console.error("[affiliates] coupon lookup failed", { affiliateId, error: error.message });
  if (!data) return null;
  const { data: uses, error: usesError } = await sb.rpc("coupon_redemptions", { p_coupon_id: data.id });
  if (usesError) console.error("[affiliates] coupon uses failed", { affiliateId, error: usesError.message });
  return { ...(data as Omit<AffiliateCoupon, "uses">), uses: Number(uses ?? 0) };
}

type CouponSetting = Pick<Affiliate, "coupon_percent" | "active">;

/**
 * Keeps the affiliate's code in step after the team saves them (see affiliateCouponPatch). Checkout
 * reads the discount from the affiliate itself, so this only keeps Coupons accurate. Returns whether it worked.
 */
export async function syncAffiliateCoupon(affiliateId: string, before: CouponSetting, after: CouponSetting): Promise<boolean> {
  const { error } = await createServiceClient().from("coupons").update(affiliateCouponPatch(before, after)).eq("affiliate_id", affiliateId);
  if (error) console.error("[affiliates] coupon sync failed", { affiliateId, error: error.message });
  return !error;
}

export interface AffiliateStats {
  visits: number;
  sales: number;
  pendingCents: number;
  paidCents: number;
  voidCents: number;
}

export const NO_STATS: AffiliateStats = { visits: 0, sales: 0, pendingCents: 0, paidCents: 0, voidCents: 0 };

export function affiliateLink(code: string): string {
  return `${siteUrl()}/a/${code}`;
}

/** The affiliate a checkout came through (from the link's cookie), unless it's their own purchase. */
export async function affiliateForCheckout(cookieCode: string | undefined, buyer: { id: string; email: string }): Promise<string | null> {
  if (!cookieCode || !isAffiliateCode(cookieCode)) return null;
  const { data, error } = await createServiceClient().from("affiliates").select("id, user_id, email, active").eq("code", cookieCode).maybeSingle();
  if (error) console.error("[affiliates] checkout lookup failed", { error: error.message });
  if (!data || !data.active || isOwnPurchase(data, buyer)) return null;
  return data.id as string;
}

/**
 * A paid order through an affiliate earns their commission on what was paid (tax excluded), once.
 * Throws on a database error so the payment webhook retries.
 */
export async function recordCommission(order: { id: string; affiliate_id: string | null; currency: string }, paidCents: number): Promise<void> {
  // Free orders (or a 100% code) earn nothing and don't count as sales.
  if (!order.affiliate_id || paidCents <= 0) return;
  const sb = createServiceClient();
  const { data: affiliate, error } = await sb.from("affiliates").select("commission_percent").eq("id", order.affiliate_id).maybeSingle();
  if (error) throw new Error(`affiliate lookup failed for order ${order.id}: ${error.message}`);
  if (!affiliate) return; // removed since; nothing to pay
  const percent = Number(affiliate.commission_percent);
  const { error: insertError } = await sb.from("affiliate_commissions").upsert(
    {
      affiliate_id: order.affiliate_id,
      order_id: order.id,
      base_cents: paidCents,
      percent,
      amount_cents: commissionCents(paidCents, percent),
      currency: order.currency,
    },
    { onConflict: "order_id", ignoreDuplicates: true },
  );
  if (insertError) throw new Error(`commission failed for order ${order.id}: ${insertError.message}`);
}

/** A refunded order earns nothing (a commission already paid shows as voided after payout). */
export async function voidCommission(orderId: string): Promise<void> {
  const { error } = await createServiceClient()
    .from("affiliate_commissions")
    .update({ status: "void", voided_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .neq("status", "void");
  if (error) throw new Error(`commission void failed for order ${orderId}: ${error.message}`);
}

export async function loadAffiliateStats(affiliateId: string): Promise<AffiliateStats> {
  const { data, error } = await createServiceClient().rpc("affiliate_stats", { p_affiliate_id: affiliateId }).maybeSingle<{
    visits: number;
    sales: number;
    pending_cents: number;
    paid_cents: number;
    void_cents: number;
  }>();
  if (error || !data) {
    if (error) console.error("[affiliates] stats failed", { affiliateId, error: error.message });
    return NO_STATS;
  }
  return {
    visits: Number(data.visits),
    sales: Number(data.sales),
    pendingCents: Number(data.pending_cents),
    paidCents: Number(data.paid_cents),
    voidCents: Number(data.void_cents),
  };
}

/**
 * The signed-in member's affiliate account: by account, else by email, which then links it to the
 * account. Only a confirmed email links (anyone can sign up with someone else's address).
 */
export async function affiliateForMember(user: { id: string; email: string | undefined; emailConfirmed: boolean }): Promise<Affiliate | null> {
  const sb = createServiceClient();
  const { data: byUser } = await sb.from("affiliates").select(AFFILIATE_COLUMNS).eq("user_id", user.id).maybeSingle();
  if (byUser) return byUser as Affiliate;
  if (!user.email || !user.emailConfirmed) return null;
  // Stored lower-case; an exact match (ilike would treat _ and % as wildcards).
  const { data: byEmail } = await sb.from("affiliates").select(AFFILIATE_COLUMNS).eq("email", user.email.trim().toLowerCase()).is("user_id", null).maybeSingle();
  if (!byEmail) return null;
  const { error } = await sb.from("affiliates").update({ user_id: user.id }).eq("id", byEmail.id).is("user_id", null);
  if (error) console.error("[affiliates] linking account failed", { affiliateId: byEmail.id, error: error.message });
  return { ...(byEmail as Affiliate), user_id: user.id };
}

/** Welcome email with their link and where to see their numbers. Returns whether it was sent. */
export async function sendAffiliateWelcome(affiliate: Pick<Affiliate, "name" | "email" | "code" | "commission_percent" | "coupon_percent">): Promise<boolean> {
  const firstName = affiliate.name.trim().split(/\s+/)[0];
  return sendEmail({
    to: affiliate.email,
    subject: "Your Bonded affiliate link",
    text: [
      `Hi ${firstName},`,
      "",
      "Welcome to the Bonded affiliate program! Share this link:",
      affiliateLink(affiliate.code),
      "",
      `You earn ${affiliate.commission_percent}% of every purchase made within 30 days of someone using it.`,
      "",
      ...(affiliate.coupon_percent
        ? [`You can also create your own discount code on your affiliate page: it gives your people ${affiliate.coupon_percent}% off, and every purchase with it earns you the same commission.`, ""]
        : []),
      `See your visits, sales and earnings any time (sign in or create a free account with this email): ${siteUrl()}/affiliate`,
      "",
      "Thank you for spreading the word,",
      "Roni's team",
    ].join("\n"),
  });
}
