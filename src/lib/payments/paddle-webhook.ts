import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { BillingEvent, SubscriptionStatus } from "./types";

/**
 * Paddle Billing webhooks: signature verification + translation to BillingEvent.
 * Signature header: "ts=<unix>;h1=<hex>[;h1=<hex>]" where h1 = HMAC-SHA256(secret, `${ts}:${rawBody}`).
 * https://developer.paddle.com/webhooks/signature-verification
 */
const MAX_AGE_SECONDS = 300;

export function verifyPaddleSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowMs: number = Date.now()
): boolean {
  if (!header || !secret) return false;
  const parts = header.split(";").map((p) => p.trim().split("="));
  const ts = Number(parts.find(([k]) => k === "ts")?.[1]);
  const signatures = parts.filter(([k, v]) => k === "h1" && v).map(([, v]) => v);
  if (!Number.isFinite(ts) || signatures.length === 0) return false;
  if (Math.abs(nowMs / 1000 - ts) > MAX_AGE_SECONDS) return false;

  const expected = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest();
  return signatures.some((sig) => {
    const given = Buffer.from(sig, "hex");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

const CustomData = z.object({ order_id: z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional() }).passthrough().nullable().optional();
const Period = z.object({ starts_at: z.string(), ends_at: z.string() }).nullable().optional();

const Envelope = z.object({ event_id: z.string(), event_type: z.string(), data: z.record(z.string(), z.unknown()) });

const Transaction = z.object({
  id: z.string(),
  origin: z.string().nullable().optional(),
  subscription_id: z.string().nullable().optional(),
  currency_code: z.string(),
  custom_data: CustomData,
  details: z.object({ totals: z.object({ grand_total: z.string() }) }),
  billing_period: Period,
});

const Subscription = z.object({
  id: z.string(),
  status: z.enum(["active", "trialing", "past_due", "paused", "canceled"]),
  custom_data: CustomData,
  current_billing_period: Period,
  canceled_at: z.string().nullable().optional(),
});

const Adjustment = z.object({
  action: z.string(),
  status: z.string(),
  type: z.string().optional(),
  transaction_id: z.string(),
});

const ignored = (reason: string): BillingEvent => ({ kind: "ignored", reason });

export function mapPaddleEvent(payload: unknown): BillingEvent {
  const envelope = Envelope.safeParse(payload);
  if (!envelope.success) return ignored("not a Paddle event");
  const { event_type: type, data } = envelope.data;

  if (type === "transaction.completed") {
    const tx = Transaction.safeParse(data);
    if (!tx.success) return ignored(`unexpected transaction payload: ${tx.error.issues[0]?.path.join(".")}`);
    const t = tx.data;
    return {
      kind: "order.paid",
      orderId: t.custom_data?.order_id ?? null,
      providerRef: t.id,
      subscriptionRef: t.subscription_id ?? null,
      recurring: t.origin === "subscription_recurring",
      amountCents: Number.parseInt(t.details.totals.grand_total, 10) || 0,
      currency: t.currency_code,
      periodEnd: t.billing_period?.ends_at ?? null,
    };
  }

  if (type.startsWith("subscription.")) {
    const sub = Subscription.safeParse(data);
    if (!sub.success) return ignored(`unexpected subscription payload: ${sub.error.issues[0]?.path.join(".")}`);
    const s = sub.data;
    return {
      kind: "subscription.updated",
      subscriptionRef: s.id,
      orderId: s.custom_data?.order_id ?? null,
      status: s.status as SubscriptionStatus,
      periodEnd: s.current_billing_period?.ends_at ?? null,
      canceledAt: s.canceled_at ?? null,
    };
  }

  if (type === "adjustment.created" || type === "adjustment.updated") {
    const adj = Adjustment.safeParse(data);
    if (!adj.success) return ignored("unexpected adjustment payload");
    const a = adj.data;
    if ((a.action === "refund" || a.action === "chargeback") && a.status === "approved") {
      return { kind: "order.refunded", providerRef: a.transaction_id, full: a.type !== "partial" };
    }
    return ignored(`adjustment ${a.action}/${a.status}`);
  }

  return ignored(`unhandled event ${type}`);
}
