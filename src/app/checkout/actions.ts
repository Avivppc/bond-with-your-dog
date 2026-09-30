"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getPaymentProvider, configuredProvider } from "@/lib/payments/provider";
import { fulfillOrder, recordBillingEvent, markBillingEvent } from "@/lib/payments/billing";
import { siteUrl } from "@/lib/email";

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
  const { data: courses } = await sb.from("offer_courses").select("course_id").eq("offer_id", offerId);
  const courseIds = (courses ?? []).map((c) => c.course_id);
  if (courseIds.length === 0) return false;
  const nowIso = new Date().toISOString();
  const { data: active } = await sb
    .from("enrollments")
    .select("course_id")
    .eq("user_id", userId)
    .in("course_id", courseIds)
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
  return (active ?? []).length === courseIds.length;
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

  const { data: order, error } = await sb
    .from("orders")
    .insert({
      user_id: user.id,
      offer_id: offer.id,
      status: "pending",
      amount_cents: offer.price_cents,
      currency: offer.currency,
      provider: provider?.name ?? "free",
    })
    .select("id")
    .single();
  if (error || !order) {
    console.error("[checkout] order insert failed", { slug: slug.data, error: error?.message });
    redirect(`/checkout/${slug.data}?error=failed`);
  }

  if (offer.payment_type === "free") {
    await fulfillOrder(order.id, { provider: "free", providerRef: null, subscriptionRef: null, periodEnd: null, amountCents: 0 });
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
  });
  await markBillingEvent("test", eventId, null);
  redirect(`/checkout/success?order=${order.id}`);
}
