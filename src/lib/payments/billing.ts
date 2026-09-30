import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { accessGrantedEmail, sendEmail } from "@/lib/email";
import type { BillingEvent } from "./types";

/**
 * Applies provider-agnostic billing events to orders, subscriptions and access.
 * Every webhook is first recorded in billing_events (unique per provider+event id),
 * so redelivered webhooks are acknowledged but never applied twice.
 */
type Sb = ReturnType<typeof createServiceClient>;

const GRACE_DAYS = 3; // keep access a little past period end while renewals retry

interface OrderRow {
  id: string;
  user_id: string;
  offer_id: string;
  status: string;
}

interface OfferRow {
  id: string;
  payment_type: "free" | "one_time" | "subscription";
  days_of_access: number | null;
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

export async function markBillingEvent(provider: string, eventId: string, error: string | null): Promise<void> {
  const { error: updateError } = await createServiceClient()
    .from("billing_events")
    .update({ processed_at: new Date().toISOString(), error })
    .eq("provider", provider)
    .eq("event_id", eventId);
  if (updateError) console.error("[billing] could not mark event", { provider, eventId, error: updateError.message });
}

async function grant(sb: Sb, order: Pick<OrderRow, "user_id" | "offer_id" | "id">, source: string, expiresAt: string | null) {
  const { data: created, error } = await sb.rpc("grant_offer_access", {
    p_user_id: order.user_id,
    p_offer_id: order.offer_id,
    p_source: source,
    p_order_id: order.id,
    p_expires_at: expiresAt,
  });
  if (error) throw new Error(`grant_offer_access failed: ${error.message}`);
  return Number(created ?? 0);
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
  const { data, error } = await sb.from("offers").select("id, payment_type, days_of_access").eq("id", offerId).single();
  if (error || !data) throw new Error(`offer ${offerId} not found`);
  return data as OfferRow;
}

/** Marks a pending order paid and grants access (shared by webhooks, free offers and test mode). */
export async function fulfillOrder(
  orderId: string,
  payment: { providerRef: string | null; subscriptionRef: string | null; periodEnd: string | null; provider: string }
): Promise<void> {
  const sb = createServiceClient();
  const { data: order } = await sb.from("orders").select("id, user_id, offer_id, status").eq("id", orderId).maybeSingle();
  if (!order) throw new Error(`order ${orderId} not found`);
  if (order.status === "paid") return; // already fulfilled

  const offer = await loadOffer(sb, order.offer_id);
  const { error: updateError } = await sb
    .from("orders")
    .update({ status: "paid", paid_at: new Date().toISOString(), provider_ref: payment.providerRef })
    .eq("id", order.id)
    .eq("status", "pending");
  if (updateError) throw new Error(`could not mark order paid: ${updateError.message}`);

  const expiresAt =
    offer.payment_type === "subscription"
      ? withGrace(payment.periodEnd)
      : offer.days_of_access
        ? new Date(Date.now() + offer.days_of_access * 86_400_000).toISOString()
        : null;
  await grant(sb, order, offer.payment_type === "subscription" ? "subscription" : "order", expiresAt);

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
  await notifyAccessGranted(order.user_id, order.offer_id);
}

export async function applyBillingEvent(provider: string, event: BillingEvent): Promise<void> {
  const sb = createServiceClient();

  switch (event.kind) {
    case "ignored":
      return;

    case "order.paid": {
      if (event.recurring && event.subscriptionRef) {
        const { data: sub } = await sb
          .from("subscriptions")
          .select("id, user_id, offer_id, order_id")
          .eq("provider_ref", event.subscriptionRef)
          .maybeSingle();
        if (!sub) throw new Error(`renewal for unknown subscription ${event.subscriptionRef}`);
        await grant(sb, { id: sub.order_id, user_id: sub.user_id, offer_id: sub.offer_id }, "subscription", withGrace(event.periodEnd));
        await sb
          .from("subscriptions")
          .update({ status: "active", current_period_end: event.periodEnd, updated_at: new Date().toISOString() })
          .eq("id", sub.id);
        return;
      }
      if (!event.orderId) throw new Error(`payment ${event.providerRef} has no order id in custom data`);
      await fulfillOrder(event.orderId, {
        providerRef: event.providerRef,
        subscriptionRef: event.subscriptionRef,
        periodEnd: event.periodEnd,
        provider,
      });
      return;
    }

    case "subscription.updated": {
      const { data: sub } = await sb
        .from("subscriptions")
        .select("id, user_id, offer_id, order_id")
        .eq("provider_ref", event.subscriptionRef)
        .maybeSingle();
      if (!sub) {
        // Subscription events can arrive before transaction.completed; the payment creates the row.
        console.warn("[billing] subscription event before payment", { ref: event.subscriptionRef, status: event.status });
        return;
      }
      await sb
        .from("subscriptions")
        .update({
          status: event.status,
          current_period_end: event.periodEnd ?? undefined,
          canceled_at: event.canceledAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);
      if (event.status === "canceled") {
        const { error } = await sb.rpc("revoke_offer_access", {
          p_user_id: sub.user_id,
          p_offer_id: sub.offer_id,
          p_order_id: sub.order_id,
        });
        if (error) throw new Error(`revoke on cancel failed: ${error.message}`);
      }
      return;
    }

    case "order.refunded": {
      if (!event.full) return; // partial refunds keep access
      const { data: order } = await sb
        .from("orders")
        .select("id, user_id, offer_id, status")
        .eq("provider_ref", event.providerRef)
        .maybeSingle();
      if (!order) throw new Error(`refund for unknown transaction ${event.providerRef}`);
      await sb.from("orders").update({ status: "refunded" }).eq("id", order.id);
      const { error } = await sb.rpc("revoke_offer_access", {
        p_user_id: order.user_id,
        p_offer_id: order.offer_id,
        p_order_id: order.id,
      });
      if (error) throw new Error(`revoke on refund failed: ${error.message}`);
      return;
    }
  }
}
