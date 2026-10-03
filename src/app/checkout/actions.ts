"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getPaymentProvider, configuredProvider } from "@/lib/payments/provider";
import { fulfillOrder, recordBillingEvent, markBillingEvent } from "@/lib/payments/billing";
import { siteUrl } from "@/lib/email";
import { ownsEverything, type AccessLevel } from "@/lib/offer-ownership";
import { cookies } from "next/headers";
import { REFERRAL_COOKIE } from "@/lib/referrals";
import { claimReferralCode, referralQuote } from "@/lib/referrals-server";
import { upsellQuote } from "@/lib/flows/server/checkout";

const Slug = z.string().regex(/^[a-z0-9-]{2,80}$/);

async function signedInUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** True when the user already has live access to every course in the offer (avoid double charging). */
async function alreadyOwnsOffer(userId: string, offerId: string): Promise<boolean> {
  const sb = createServiceClient();
  const { data: courses } = await sb.from("offer_courses").select("course_id, access_level").eq("offer_id", offerId);
  const offerCourses = (courses ?? []) as { course_id: string; access_level: AccessLevel }[];
  if (offerCourses.length === 0) return false;
  const nowIso = new Date().toISOString();
  const { data: active } = await sb
    .from("enrollments")
    .select("course_id, access_level")
    .eq("user_id", userId)
    .in(
      "course_id",
      offerCourses.map((c) => c.course_id)
    )
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
  return ownsEverything(offerCourses, (active ?? []) as { course_id: string; access_level: AccessLevel }[]);
}

/** Creates a pending order and sends the buyer to the provider (free offers are fulfilled at once). */
export async function startCheckout(formData: FormData): Promise<void> {
  const slug = Slug.safeParse(formData.get("slug"));
  if (!slug.success) redirect("/courses");
  const user = await signedInUser();
  if (!user?.email) redirect(`/login?next=/checkout/${slug.data}`);

  const sb = createServiceClient();
  const { data: offer } = await sb
    .from("offers")
    .select("id, payment_type, price_cents, currency, provider_price_id, status")
    .eq("slug", slug.data)
    .eq("status", "published")
    .maybeSingle();
  if (!offer) redirect(`/checkout/${slug.data}?error=unavailable`);
  if (await alreadyOwnsOffer(user.id, offer.id)) redirect(`/checkout/${slug.data}?error=owned`);

  const provider = offer.payment_type === "free" ? null : getPaymentProvider();
  if (offer.payment_type !== "free" && !provider) redirect(`/checkout/${slug.data}?error=not-configured`);

  // A friend who arrived through a referral link is attributed before the discount is worked out.
  const jar = await cookies();
  const referralCode = jar.get(REFERRAL_COOKIE)?.value;
  if (referralCode && (await claimReferralCode(await createClient(), referralCode))) jar.delete(REFERRAL_COOKIE);
  const quote = offer.payment_type === "free" ? null : await referralQuote({ userId: user.id, offerId: offer.id, priceCents: offer.price_cents, provider: provider?.name ?? null });
  // A personal code from an email flow; one discount per purchase, so the bigger one wins.
  const codeInput = String(formData.get("code") ?? "").trim();
  // Only through a provider that charges our amount, so a discount shown is a discount charged.
  const upsell = codeInput && provider?.chargesOrderAmount ? await upsellQuote({ userId: user.id, offerId: offer.id, paymentType: offer.payment_type, priceCents: offer.price_cents, code: codeInput }) : null;
  const useUpsell = upsell?.ok === true && upsell.percent >= (quote?.discount?.percent ?? 0);
  // A code sits on one open order: starting checkout again replaces the member's earlier unpaid one.
  if (useUpsell && upsell?.ok) {
    await sb.from("orders").update({ status: "canceled" }).eq("user_id", user.id).eq("discount_code_id", upsell.codeId).eq("status", "pending");
  }

  const { data: order, error } = await sb
    .from("orders")
    .insert({
      user_id: user.id,
      offer_id: offer.id,
      status: "pending",
      amount_cents: useUpsell && upsell?.ok ? upsell.amountCents : (quote?.amountCents ?? offer.price_cents),
      currency: offer.currency,
      provider: provider?.name ?? "free",
      discount_kind: useUpsell ? "upsell" : (quote?.discount?.kind ?? null),
      discount_percent: useUpsell && upsell?.ok ? upsell.percent : (quote?.discount?.percent ?? null),
      referral_reward_id: useUpsell ? null : (quote?.discount?.rewardId ?? null),
      discount_code_id: useUpsell && upsell?.ok ? upsell.codeId : null,
    })
    .select("id")
    .single();
  if (error?.code === "23505") redirect(`/checkout/${slug.data}?error=code-used`);
  if (error || !order) {
    console.error("[checkout] order insert failed", { slug: slug.data, error: error?.message });
    redirect(`/checkout/${slug.data}?error=failed`);
  }

  if (offer.payment_type === "free") {
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
      discountId: useUpsell ? null : (quote?.paddleDiscountId ?? null),
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
    redirect(`/checkout/${slug.data}?error=provider`);
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
