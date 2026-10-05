"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getPaymentProvider, configuredProvider } from "@/lib/payments/provider";
import { fulfillOrder, recordBillingEvent, markBillingEvent } from "@/lib/payments/billing";
import { siteUrl } from "@/lib/email";
import { cookies } from "next/headers";
import { REFERRAL_COOKIE } from "@/lib/referrals";
import { AFFILIATE_COOKIE } from "@/lib/affiliates/rules";
import { affiliateForCheckout } from "@/lib/affiliates/server";
import { claimReferralCode } from "@/lib/referrals-server";
import { planCheckout } from "@/lib/sales/checkout-plan";
import { OFFER_FOR_SALE_COLUMNS, ownsOffer, type OfferForSale } from "@/lib/sales/server";

const Slug = z.string().regex(/^[a-z0-9-]{2,80}$/);

async function signedInUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Fields a checkout form may send besides the slug. */
function checkoutChoices(formData: FormData) {
  const text = (name: string, max: number) => String(formData.get(name) ?? "").slice(0, max);
  const giftOn = formData.get("gift") === "on";
  return {
    code: text("code", 60),
    wantBump: formData.get("bump") === "on",
    after: text("after", 40) || null,
    gift: giftOn ? { recipientEmail: text("recipient_email", 254), recipientName: text("recipient_name", 60), message: text("gift_message", 500) } : null,
  };
}

/**
 * Creates a pending order and sends the buyer to the provider (free orders are fulfilled at once).
 * The amount comes from planCheckout, the same calculation the checkout page showed.
 */
export async function startCheckout(formData: FormData): Promise<void> {
  const slug = Slug.safeParse(formData.get("slug"));
  if (!slug.success) redirect("/courses");
  const user = await signedInUser();
  if (!user?.email) redirect(`/login?next=/checkout/${slug.data}`);
  const choices = checkoutChoices(formData);
  // Annotated so TypeScript knows control stops after it (redirect throws).
  const back: (params: Record<string, string | null>) => never = (params) => {
    const query = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])));
    redirect(`/checkout/${slug.data}${query.size ? `?${query.toString()}` : ""}`);
  };

  const sb = createServiceClient();
  const { data: offerRow } = await sb
    .from("offers")
    .select(`${OFFER_FOR_SALE_COLUMNS}, provider_price_id`)
    .eq("slug", slug.data)
    .eq("status", "published")
    .maybeSingle();
  if (!offerRow) back({ error: "unavailable" });
  const offer = offerRow as unknown as OfferForSale & { provider_price_id: string | null };
  // A gift goes to someone else, so the buyer may already own it.
  if (!choices.gift && (await ownsOffer(user.id, offer.id))) back({ error: "owned" });

  const provider = offer.payment_type === "free" ? null : getPaymentProvider();
  if (offer.payment_type !== "free" && !provider) back({ error: "not-configured" });

  // A friend who arrived through a referral link is attributed before the discount is worked out.
  const jar = await cookies();
  const referralCode = jar.get(REFERRAL_COOKIE)?.value;
  if (referralCode && (await claimReferralCode(await createClient(), referralCode))) jar.delete(REFERRAL_COOKIE);
  // An affiliate's link visited in the last 30 days earns them a commission on this purchase.
  const affiliateId = await affiliateForCheckout(jar.get(AFFILIATE_COOKIE)?.value, { id: user.id, email: user.email });

  const plan = await planCheckout({
    userId: user.id,
    userEmail: user.email,
    offer,
    provider,
    code: choices.code,
    wantBump: choices.wantBump,
    gift: choices.gift,
    afterOrderId: choices.after,
  });
  // The page shows what's wrong with a code or a gift; nothing is charged meanwhile.
  if (plan.codeProblem) back({ code: choices.code, after: choices.after });
  if (choices.gift && !plan.gift) back({ error: "gift", code: choices.code });

  // A code (or an after-purchase offer) sits on one open order: starting again replaces the earlier unpaid one.
  const d = plan.discount;
  if (d?.codeId) await sb.from("orders").update({ status: "canceled" }).eq("user_id", user.id).eq("discount_code_id", d.codeId).eq("status", "pending");
  if (d?.couponId) await sb.from("orders").update({ status: "canceled" }).eq("user_id", user.id).eq("coupon_id", d.couponId).eq("status", "pending");
  if (d?.parentOrderId) await sb.from("orders").update({ status: "canceled" }).eq("user_id", user.id).eq("upsell_of_order_id", d.parentOrderId).eq("status", "pending");

  const free = offer.payment_type === "free" || plan.totalCents === 0;
  const { data: order, error } = await sb
    .from("orders")
    .insert({
      user_id: user.id,
      offer_id: offer.id,
      status: "pending",
      amount_cents: plan.totalCents,
      currency: offer.currency,
      provider: free ? "free" : provider!.name,
      discount_kind: d?.kind ?? null,
      discount_percent: d?.percent ?? null,
      referral_reward_id: d?.rewardId ?? null,
      discount_code_id: d?.codeId ?? null,
      coupon_id: d?.couponId ?? null,
      upsell_of_order_id: d?.parentOrderId ?? null,
      bump_offer_id: plan.bumpAccepted && plan.bump ? plan.bump.offer.id : null,
      bump_amount_cents: plan.bumpAccepted && plan.bump ? plan.bump.priceCents : null,
      gift_recipient_email: plan.gift?.recipientEmail ?? null,
      gift_recipient_name: plan.gift?.recipientName ?? null,
      gift_message: plan.gift?.message || null,
      // A typed affiliate code wins over a link visited earlier.
      affiliate_id: plan.codeAffiliateId ?? affiliateId,
    })
    .select("id")
    .single();
  if (error?.code === "23505") back({ error: "code-used" });
  if (error?.code === "54000") back({ error: "code-limit" });
  if (error || !order) {
    console.error("[checkout] order insert failed", { slug: slug.data, error: error?.message });
    back({ error: "failed" });
  }

  if (free) {
    await fulfillOrder(order.id, { provider: "free", providerRef: null, subscriptionRef: null, periodEnd: null, amountCents: 0, taxCents: 0, paymentMethod: "free" });
    redirect(`/checkout/success?order=${order.id}`);
  }

  let destination: string;
  try {
    const session = await provider!.createCheckout({
      orderId: order.id,
      userId: user.id,
      offerId: offer.id,
      customerEmail: user.email,
      providerPriceId: offer.provider_price_id,
      successUrl: `${siteUrl()}/checkout/success?order=${order.id}`,
      discountId: d?.paddleDiscountId ?? null,
    });
    // Webhooks are matched on this server-created transaction id, never on buyer-supplied data.
    if (session.providerRef) {
      const { error: refError } = await sb.from("orders").update({ provider_ref: session.providerRef }).eq("id", order.id);
      if (refError) throw new Error(`could not store provider reference: ${refError.message}`);
    }
    destination = session.url;
  } catch (e: unknown) {
    console.error("[checkout] provider checkout failed", { orderId: order.id, error: e instanceof Error ? e.message : e });
    await sb.from("orders").update({ status: "failed" }).eq("id", order.id);
    back({ error: "provider" });
  }
  redirect(destination);
}

const TestPay = z.object({ order: z.string().uuid(), outcome: z.enum(["pay", "cancel"]) });

/** Local development only: simulates a successful provider payment for the buyer's own test order. */
export async function completeTestPayment(formData: FormData): Promise<void> {
  if (configuredProvider() !== "test") redirect("/");
  const parsed = TestPay.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/");
  const user = await signedInUser();
  if (!user) redirect("/login");

  const sb = createServiceClient();
  const { data: order } = await sb
    .from("orders")
    .select("id, user_id, status, provider, offers(payment_type, interval)")
    .eq("id", parsed.data.order)
    .maybeSingle();
  if (!order || order.user_id !== user.id || order.provider !== "test" || order.status !== "pending") redirect("/");

  if (parsed.data.outcome === "cancel") {
    await sb.from("orders").update({ status: "canceled" }).eq("id", order.id).eq("status", "pending");
    redirect(`/checkout/success?order=${order.id}`);
  }

  const offer = order.offers as unknown as { payment_type: string; interval: string | null } | null;
  const isSubscription = offer?.payment_type === "subscription";
  const periodEnd = isSubscription
    ? new Date(Date.now() + (offer?.interval === "year" ? 365 : 30) * 86_400_000).toISOString()
    : null;
  const eventId = `test_evt_${randomUUID()}`;
  await recordBillingEvent("test", eventId, "order.paid", { order_id: order.id });
  await fulfillOrder(order.id, {
    provider: "test",
    providerRef: `test_txn_${randomUUID()}`,
    subscriptionRef: isSubscription ? `test_sub_${randomUUID()}` : null,
    periodEnd,
    amountCents: null,
    taxCents: 0,
    paymentMethod: "test",
  });
  await markBillingEvent("test", eventId, null);
  redirect(`/checkout/success?order=${order.id}`);
}
