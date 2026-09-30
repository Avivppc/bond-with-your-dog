import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { accessGrantedEmail, sendEmail } from "@/lib/email";
import type { BillingEvent } from "./types";
import { validatePayment } from "./validate-payment";

/**
 * Applies provider-agnostic billing events to orders, subscriptions and access.
 * Every webhook is recorded once in billing_events and claimed atomically, so
 * redelivered or concurrent webhooks are never applied twice.
 */
type Sb = ReturnType<typeof createServiceClient>;

const GRACE_DAYS = 3; // keep access a little past period end while renewals retry

/** A delivered event we deliberately do not act on (unknown/foreign transaction, mismatch). */
export class BillingIgnored extends Error {}

interface OfferRow {
  id: string;
  payment_type: "free" | "one_time" | "subscription";
  days_of_access: number | null;
  provider_price_id: string | null;
}

function withGrace(periodEnd: string | null): string | null {
  if (!periodEnd) return null;
  return new Date(new Date(periodEnd).getTime() + GRACE_DAYS * 86_400_000).toISOString();
}

/**
 * Records a webhook once. "processed" = delivered before and applied successfully (skip);
 * "retry" = seen before but failed or unfinished (apply again — the provider is retrying).
 */
export async function recordBillingEvent(
  provider: string,
  eventId: string,
  type: string,
  payload: unknown
): Promise<"new" | "processed" | "retry"> {
  const sb = createServiceClient();
  const { error } = await sb.from("billing_events").insert({ provider, event_id: eventId, type, payload: payload as object });
  if (!error) return "new";
  if (error.code !== "23505") throw new Error(`could not record billing event: ${error.message}`);

  const { data: existing } = await sb
    .from("billing_events")
    .select("processed_at, error")
    .eq("provider", provider)
    .eq("event_id", eventId)
    .single();
  return existing?.processed_at && !existing.error ? "processed" : "retry";
}

/** Atomically claims an unprocessed event; false when another delivery is already working on it. */
export async function claimBillingEvent(provider: string, eventId: string): Promise<boolean> {
  const { data, error } = await createServiceClient().rpc("claim_billing_event", { p_provider: provider, p_event_id: eventId });
  if (error) throw new Error(`could not claim billing event: ${error.message}`);
  return data === true;
}

/** outcome: null = applied, "ignored: …" = deliberately skipped (done), any other string = failed (retry). */
export async function markBillingEvent(provider: string, eventId: string, outcome: string | null, failed = false): Promise<void> {
  const update = failed
    ? { error: outcome, processing_started_at: null, processed_at: null }
    : { error: outcome, processed_at: new Date().toISOString() };
  const { error } = await createServiceClient().from("billing_events").update(update).eq("provider", provider).eq("event_id", eventId);
  if (error) console.error("[billing] could not mark event", { provider, eventId, error: error.message });
}

async function grant(sb: Sb, userId: string, offerId: string, orderId: string | null, source: string, expiresAt: string | null) {
  const { error } = await sb.rpc("grant_offer_access", {
    p_user_id: userId,
    p_offer_id: offerId,
    p_source: source,
    p_order_id: orderId,
    p_expires_at: expiresAt,
  });
  if (error) throw new Error(`grant_offer_access failed: ${error.message}`);
}

async function revoke(sb: Sb, userId: string, offerId: string, orderId: string | null) {
  const { error } = await sb.rpc("revoke_offer_access", { p_user_id: userId, p_offer_id: offerId, p_order_id: orderId });
  if (error) throw new Error(`revoke_offer_access failed: ${error.message}`);
}

/** Emails the buyer the course links. Never throws — access is already granted. */
export async function notifyAccessGranted(userId: string, offerId: string): Promise<void> {
  try {
    const sb = createServiceClient();
    const [{ data: user }, { data: courses }] = await Promise.all([
      sb.auth.admin.getUserById(userId),
      sb.from("offer_courses").select("courses(id, title)").eq("offer_id", offerId),
    ]);
    const email = user.user?.email;
    const list = (courses ?? []).flatMap((c) => (c.courses ? [c.courses as unknown as { id: string; title: string }] : []));
    if (email && list.length > 0) await sendEmail(accessGrantedEmail(email, list));
  } catch (error: unknown) {
    console.error("[billing] access email failed", { userId, offerId, error: error instanceof Error ? error.message : error });
  }
}

async function loadOffer(sb: Sb, offerId: string): Promise<OfferRow> {
  const { data, error } = await sb
    .from("offers")
    .select("id, payment_type, days_of_access, provider_price_id")
    .eq("id", offerId)
    .single();
  if (error || !data) throw new Error(`offer ${offerId} not found`);
  return data as OfferRow;
}

export interface FulfillmentPayment {
  provider: string;
  providerRef: string | null;
  subscriptionRef: string | null;
  periodEnd: string | null;
  amountCents: number | null; // actually charged (incl. tax/discounts); null = keep order amount
  taxCents: number; // tax inside amountCents; the revenue ledger records amount minus tax
  paymentMethod: string | null; // card, paypal… ("free" / "test" for those providers)
}

interface LedgerRow {
  event_key: string;
  user_id: string;
  offer_id: string;
  order_id: string | null;
  subscription_id?: string | null;
  provider: string;
  provider_ref: string | null;
  kind: "charge" | "refund";
  amount_cents: number;
  currency: string;
  payment_method: string | null;
  is_renewal?: boolean;
}

/** Adds a row to the payments ledger (analytics). The event key makes replays a no-op. */
async function recordPayment(sb: Sb, row: LedgerRow): Promise<void> {
  const { error } = await sb.from("payments").upsert(row, { onConflict: "event_key", ignoreDuplicates: true });
  if (error) throw new Error(`could not record payment ${row.event_key}: ${error.message}`);
}

/**
 * Grants access for a pending order, then marks it paid. Idempotent: re-running for a
 * paid order re-applies the (idempotent) grant; refunded/canceled/failed orders never
 * get access. The access email is sent only on the pending → paid transition.
 */
export async function fulfillOrder(orderId: string, payment: FulfillmentPayment): Promise<void> {
  const sb = createServiceClient();
  const { data: order } = await sb
    .from("orders")
    .select("id, user_id, offer_id, status, amount_cents, currency")
    .eq("id", orderId)
    .maybeSingle();
  if (!order) throw new Error(`order ${orderId} not found`);
  if (order.status !== "pending" && order.status !== "paid") {
    throw new BillingIgnored(`order ${orderId} is ${order.status}; not fulfilling`);
  }

  const offer = await loadOffer(sb, order.offer_id);
  const expiresAt =
    offer.payment_type === "subscription"
      ? withGrace(payment.periodEnd)
      : offer.days_of_access
        ? new Date(Date.now() + offer.days_of_access * 86_400_000).toISOString()
        : null;
  await grant(sb, order.user_id, order.offer_id, order.id, offer.payment_type === "subscription" ? "subscription" : "order", expiresAt);

  if (payment.subscriptionRef) {
    const { error } = await sb.from("subscriptions").upsert(
      {
        user_id: order.user_id,
        offer_id: order.offer_id,
        order_id: order.id,
        provider: payment.provider,
        provider_ref: payment.subscriptionRef,
        status: "active",
        current_period_end: payment.periodEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "provider_ref" }
    );
    if (error) throw new Error(`could not store subscription: ${error.message}`);
  }

  const { data: transitioned, error: updateError } = await sb
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      ...(payment.providerRef ? { provider_ref: payment.providerRef } : {}),
      ...(payment.amountCents !== null ? { amount_cents: payment.amountCents } : {}),
      payment_method: payment.paymentMethod,
    })
    .eq("id", order.id)
    .eq("status", "pending")
    .select("id");
  if (updateError) throw new Error(`could not mark order paid: ${updateError.message}`);

  await recordPayment(sb, {
    event_key: `charge:order:${order.id}`,
    user_id: order.user_id,
    offer_id: order.offer_id,
    order_id: order.id,
    provider: payment.provider,
    provider_ref: payment.providerRef,
    kind: "charge",
    amount_cents: (payment.amountCents ?? order.amount_cents) - payment.taxCents,
    currency: order.currency,
    payment_method: payment.paymentMethod,
  });
  if ((transitioned ?? []).length > 0) await notifyAccessGranted(order.user_id, order.offer_id);

  // Referral: converts a referred friend's first purchase / consumes a used reward. Idempotent, so a
  // failure throws and the provider retries the webhook (otherwise a used reward would stay usable).
  const { error: referralError } = await sb.rpc("referral_order_paid", { p_order_id: order.id });
  if (referralError) throw new Error(`referral settlement failed for order ${order.id}: ${referralError.message}`);
}

export async function applyBillingEvent(provider: string, event: BillingEvent): Promise<void> {
  const sb = createServiceClient();

  switch (event.kind) {
    case "ignored":
      throw new BillingIgnored(event.reason);

    case "order.paid": {
      if (event.recurring && event.subscriptionRef) {
        const { data: sub } = await sb
          .from("subscriptions")
          .select("id, user_id, offer_id, order_id")
          .eq("provider_ref", event.subscriptionRef)
          .maybeSingle();
        if (!sub) throw new Error(`renewal for unknown subscription ${event.subscriptionRef}`); // retry: first payment may lag
        await grant(sb, sub.user_id, sub.offer_id, sub.order_id, "subscription", withGrace(event.periodEnd));
        await sb
          .from("subscriptions")
          .update({ status: "active", current_period_end: event.periodEnd, updated_at: new Date().toISOString() })
          .eq("id", sub.id);
        await recordPayment(sb, {
          event_key: `charge:${provider}:${event.providerRef}`,
          user_id: sub.user_id,
          offer_id: sub.offer_id,
          order_id: sub.order_id,
          subscription_id: sub.id,
          provider,
          provider_ref: event.providerRef,
          kind: "charge",
          amount_cents: event.amountCents - event.taxCents,
          currency: event.currency,
          payment_method: event.paymentMethod,
          is_renewal: true,
        });
        return;
      }

      // Only transactions our server created (stored on the order at checkout) can fulfil an order.
      const { data: order } = await sb
        .from("orders")
        .select("id, currency, offer_id")
        .eq("provider", provider)
        .eq("provider_ref", event.providerRef)
        .maybeSingle();
      if (!order) throw new BillingIgnored(`payment ${event.providerRef} does not belong to any order we created`);

      const offer = await loadOffer(sb, order.offer_id);
      const mismatch = validatePayment(order, offer, event);
      if (mismatch) {
        console.error("[billing] payment rejected", { orderId: order.id, providerRef: event.providerRef, mismatch });
        throw new BillingIgnored(`rejected: ${mismatch}`);
      }
      await fulfillOrder(order.id, {
        provider,
        providerRef: event.providerRef,
        subscriptionRef: event.subscriptionRef,
        periodEnd: event.periodEnd,
        amountCents: event.amountCents,
        taxCents: event.taxCents,
        paymentMethod: event.paymentMethod,
      });
      return;
    }

    case "subscription.updated": {
      const { data: sub } = await sb
        .from("subscriptions")
        .select("id, user_id, offer_id, order_id")
        .eq("provider_ref", event.subscriptionRef)
        .maybeSingle();
      if (!sub) throw new BillingIgnored(`subscription ${event.subscriptionRef} not created yet (payment creates it)`);
      await sb
        .from("subscriptions")
        .update({
          status: event.status,
          current_period_end: event.periodEnd ?? undefined,
          canceled_at: event.canceledAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);
      if (event.status === "canceled") await revoke(sb, sub.user_id, sub.offer_id, sub.order_id);
      return;
    }

    case "order.refunded": {
      // Every refund goes in the ledger (partial ones too); only a full refund of an order ends access.
      const { data: charge } = await sb
        .from("payments")
        .select("user_id, offer_id, order_id, subscription_id, amount_cents, currency, payment_method")
        .eq("provider", provider)
        .eq("provider_ref", event.providerRef)
        .eq("kind", "charge")
        .maybeSingle();
      if (!charge) {
        // The refund can arrive while the payment webhook is still being retried: retry the refund too.
        const { data: pendingOrder } = await sb.from("orders").select("id").eq("provider", provider).eq("provider_ref", event.providerRef).maybeSingle();
        if (pendingOrder) throw new Error(`refund for ${event.providerRef} arrived before its payment was recorded`);
        throw new BillingIgnored(`refund for ${event.providerRef} does not match a payment we recorded`);
      }
      await recordPayment(sb, {
        event_key: `refund:${provider}:${event.adjustmentRef ?? event.providerRef}`,
        user_id: charge.user_id,
        offer_id: charge.offer_id,
        order_id: charge.order_id,
        subscription_id: charge.subscription_id,
        provider,
        provider_ref: event.providerRef,
        kind: "refund",
        // The charge row is already net of tax; a provider-reported refund amount includes it.
        amount_cents: event.amountCents !== null ? event.amountCents - event.taxCents : charge.amount_cents,
        currency: charge.currency,
        payment_method: charge.payment_method,
      });
      if (!event.full) return; // partial refund keeps access

      const { data: order } = await sb
        .from("orders")
        .select("id, user_id, offer_id")
        .eq("provider", provider)
        .eq("provider_ref", event.providerRef)
        .maybeSingle();
      if (!order) {
        // A refunded subscription renewal: recorded above; access ends with the subscription (cancel event).
        return;
      }
      await sb.from("orders").update({ status: "refunded", refunded_at: new Date().toISOString() }).eq("id", order.id);
      const { error: referralError } = await sb.rpc("referral_order_refunded", { p_order_id: order.id });
      if (referralError) throw new Error(`referral reversal failed for order ${order.id}: ${referralError.message}`);
      await revoke(sb, order.user_id, order.offer_id, order.id);
      return;
    }
  }
}
