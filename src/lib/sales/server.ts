import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmail, siteUrl } from "@/lib/email";
import { ownsEverything, type AccessLevel } from "@/lib/offer-ownership";
import { isOwnPurchase } from "@/lib/affiliates/rules";
import { addOnUsable, applyCoupon, normalizeCode, type AddOnOffer, type Coupon, type CouponCheck } from "./pricing";

export interface OfferForSale {
  id: string;
  title: string;
  slug: string;
  payment_type: string;
  price_cents: number;
  currency: string;
  days_of_access: number | null;
  bump_offer_id: string | null;
  bump_price_cents: number | null;
  bump_headline: string | null;
  bump_text: string | null;
  upsell_offer_id: string | null;
  upsell_price_cents: number | null;
  upsell_headline: string | null;
  upsell_text: string | null;
  giftable: boolean;
}

export const OFFER_FOR_SALE_COLUMNS =
  "id, title, slug, payment_type, price_cents, currency, days_of_access, bump_offer_id, bump_price_cents, bump_headline, bump_text, upsell_offer_id, upsell_price_cents, upsell_headline, upsell_text, giftable";

/** affiliateId: the affiliate whose code it is (the purchase earns them the commission). */
export type CouponQuote = (CouponCheck & { ok: true; couponId: string; code: string; affiliateId: string | null }) | { ok: false; reason: string };

interface CouponAffiliate {
  user_id: string | null;
  email: string;
  active: boolean;
  coupon_percent: number | null;
}

/** A public coupon applied to an offer for this buyer, or why it can't be. */
export async function couponQuote(input: { userId: string; userEmail: string; offer: OfferForSale; code: string }, now = new Date()): Promise<CouponQuote> {
  const code = normalizeCode(input.code);
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("coupons")
    .select("id, code, percent_off, amount_off_cents, offer_ids, max_redemptions, starts_at, expires_at, active, affiliate_id, affiliates(user_id, email, active, coupon_percent)")
    .eq("code", code)
    .maybeSingle();
  if (error) {
    console.error("[sales] coupon lookup failed", { error: error.message });
    return { ok: false, reason: "We couldn't check that code. Try again." };
  }
  if (!data) return { ok: false, reason: "That code isn't valid." };
  const row = data as unknown as Coupon & { affiliate_id: string | null; affiliates: CouponAffiliate | null };
  const owner = row.affiliates;
  if (row.affiliate_id) {
    // A paused (or removed) affiliate's code stops working; their own code is for the people they share it with.
    if (!owner?.active || !owner.coupon_percent) return { ok: false, reason: "That code isn't active." };
    if (isOwnPurchase(owner, { id: input.userId, email: input.userEmail })) return { ok: false, reason: "That's your own affiliate code. It's for the people you share it with." };
  }
  // The discount the team set on the affiliate is the one charged (the coupon row only mirrors it).
  const coupon: Coupon = owner?.coupon_percent ? { ...row, percent_off: owner.coupon_percent, amount_off_cents: null } : row;
  // Only a paid order uses it up for this buyer; an unpaid attempt is replaced when they start again.
  const [redemptions, used] = await Promise.all([
    sb.rpc("coupon_redemptions", { p_coupon_id: coupon.id, p_exclude_user: input.userId }),
    sb.from("orders").select("id", { count: "exact", head: true }).eq("user_id", input.userId).eq("coupon_id", coupon.id).eq("status", "paid"),
  ]);
  if (redemptions.error || used.error) {
    console.error("[sales] coupon usage lookup failed", { error: redemptions.error?.message ?? used.error?.message });
    return { ok: false, reason: "We couldn't check that code. Try again." };
  }
  const check = applyCoupon(
    coupon,
    { id: input.offer.id, priceCents: input.offer.price_cents, currency: input.offer.currency, paymentType: input.offer.payment_type },
    { now, redemptions: Number(redemptions.data ?? 0), usedByBuyer: (used.count ?? 0) > 0 },
  );
  return check.ok ? { ...check, couponId: coupon.id, code, affiliateId: row.affiliate_id } : check;
}

export interface UsableAddOn {
  offer: AddOnOffer & { title: string; slug: string };
  priceCents: number;
  headline: string | null;
  text: string | null;
}

/** The bump or upsell offer an offer points at, when it can be sold with it (see addOnUsable). */
export async function loadAddOn(main: OfferForSale, kind: "bump" | "upsell"): Promise<UsableAddOn | null> {
  const offerId = kind === "bump" ? main.bump_offer_id : main.upsell_offer_id;
  const priceCents = kind === "bump" ? main.bump_price_cents : main.upsell_price_cents;
  if (!offerId || priceCents === null) return null;
  const { data, error } = await createServiceClient()
    .from("offers")
    .select("id, title, slug, status, payment_type, price_cents, currency")
    .eq("id", offerId)
    .maybeSingle();
  if (error) console.error("[sales] add-on lookup failed", { offerId, error: error.message });
  if (!data) return null;
  const addOn = { id: data.id, title: data.title, slug: data.slug, status: data.status, paymentType: data.payment_type, priceCents: data.price_cents, currency: data.currency };
  if (!addOnUsable({ offerId, priceCents }, addOn, { id: main.id, currency: main.currency })) return null;
  return {
    offer: addOn,
    priceCents,
    headline: kind === "bump" ? main.bump_headline : main.upsell_headline,
    text: kind === "bump" ? main.bump_text : main.upsell_text,
  };
}

/** True when the user already has live access to every course in the offer (avoid double charging). */
export async function ownsOffer(userId: string, offerId: string): Promise<boolean> {
  const sb = createServiceClient();
  const { data: courses } = await sb.from("offer_courses").select("course_id, access_level").eq("offer_id", offerId);
  const offerCourses = (courses ?? []) as { course_id: string; access_level: AccessLevel }[];
  if (offerCourses.length === 0) return false;
  const { data: active } = await sb
    .from("enrollments")
    .select("course_id, access_level")
    .eq("user_id", userId)
    .in(
      "course_id",
      offerCourses.map((c) => c.course_id),
    )
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  return ownsEverything(offerCourses, (active ?? []) as { course_id: string; access_level: AccessLevel }[]);
}

interface GiftOrder {
  id: string;
  user_id: string;
  offer_id: string;
  gift_recipient_email: string;
  gift_recipient_name: string | null;
  gift_message: string | null;
}

function giftEmail(order: GiftOrder, giverName: string, offerTitle: string, hasAccount: boolean) {
  const next = hasAccount ? `${siteUrl()}/login` : `${siteUrl()}/signup?email=${encodeURIComponent(order.gift_recipient_email)}`;
  const quoted = order.gift_message ? ["", `${giverName} wrote:`, ...order.gift_message.split(/\r?\n/).map((l) => `> ${l}`)] : [];
  return {
    to: order.gift_recipient_email,
    subject: `${giverName} sent you a gift: ${offerTitle}`.slice(0, 150),
    text: [
      `Hi ${order.gift_recipient_name ?? "there"},`,
      "",
      `${giverName} gave you ${offerTitle} on Bonded, Roni Sagi's dog-dance academy.`,
      ...quoted,
      "",
      hasAccount ? `It's already in your account: ${next}` : `Create your free account with this email address to start: ${next}`,
      "",
      "Happy training,",
      "The Bonded team",
    ].join("\n"),
  };
}

/**
 * A paid gift: access goes to the recipient (now if they have an account, otherwise waiting for
 * their sign-up with this email, tied to this order) and they get one email. Safe to run again:
 * the access steps are idempotent and gift_delivered_at is set only after them, guarding the email.
 */
export async function deliverGift(order: GiftOrder, offer: { title: string; days_of_access: number | null }): Promise<void> {
  const sb = createServiceClient();
  const { data: recipientId, error: lookupError } = await sb.rpc("find_user_id_by_email", { p_email: order.gift_recipient_email });
  if (lookupError) throw new Error(`gift recipient lookup failed: ${lookupError.message}`);
  const expiresAt = offer.days_of_access ? new Date(Date.now() + offer.days_of_access * 86_400_000).toISOString() : null;
  if (typeof recipientId === "string") {
    const { error } = await sb.rpc("grant_offer_access", { p_user_id: recipientId, p_offer_id: order.offer_id, p_source: "order", p_order_id: order.id, p_expires_at: expiresAt });
    if (error) throw new Error(`gift grant failed for order ${order.id}: ${error.message}`);
  } else {
    const { error } = await sb
      .from("access_invites")
      .insert({ email: order.gift_recipient_email, offer_id: order.offer_id, days_of_access: offer.days_of_access, invited_by: order.user_id, order_id: order.id });
    // Already waiting for them (this order on a retry, or an earlier invite): nothing more to save.
    if (error && error.code !== "23505") throw new Error(`gift invite failed for order ${order.id}: ${error.message}`);
  }

  const { data: claimed, error: claimError } = await sb
    .from("orders")
    .update({ gift_delivered_at: new Date().toISOString() })
    .eq("id", order.id)
    .is("gift_delivered_at", null)
    .select("id");
  if (claimError) throw new Error(`gift delivery mark failed for order ${order.id}: ${claimError.message}`);
  if (!claimed?.length) return; // delivered before (webhook retry): the email went already

  const { data: giver } = await sb.from("profiles").select("full_name").eq("id", order.user_id).maybeSingle();
  const giverName = (giver?.full_name as string | null)?.trim().split(/\s+/)[0] || "A friend";
  const sent = await sendEmail(giftEmail(order, giverName, offer.title, typeof recipientId === "string"));
  if (!sent) console.warn("[sales] gift email not sent (email not set up?)", { orderId: order.id });
}
