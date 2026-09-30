#!/usr/bin/env node
// Sends a correctly signed Paddle Billing webhook to a LOCAL dev server — exercises the
// real /api/webhooks/paddle route (signature check, idempotency, price/currency checks,
// fulfillment/refund).
//
// Usage:
//   node --env-file=.env.local scripts/simulate-paddle-webhook.mjs paid <orderId>
//   node --env-file=.env.local scripts/simulate-paddle-webhook.mjs refund <txnId>
//   node --env-file=.env.local scripts/simulate-paddle-webhook.mjs raw <eventId> <json-file>
//
// "paid" reads the pending order from the LOCAL Supabase, links it to a simulated Paddle
// transaction (as the real checkout does) and pays the offer's own price id and currency.
// The offer needs a Paddle price id (any "pri_…" value works locally).
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/;

function fail(message) {
  console.error(message);
  process.exit(1);
}

const url = process.env.WEBHOOK_URL ?? "http://localhost:3100/api/webhooks/paddle";
if (!LOCAL.test(url)) fail("Refusing to send simulated webhooks to a non-local URL");
const secret = process.env.PADDLE_WEBHOOK_SECRET;
if (!secret) fail("PADDLE_WEBHOOK_SECRET is not set (run with --env-file=.env.local)");

/** Minimal PostgREST call against the local Supabase with the local service key. */
async function db(path, init = {}) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) fail("Supabase env vars missing (run with --env-file=.env.local)");
  if (!LOCAL.test(base)) fail("Refusing to modify a non-local Supabase");
  const res = await fetch(`${base}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation", ...init.headers },
  });
  if (!res.ok) fail(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
}

async function paidPayload(orderId) {
  const [order] = await db(`orders?id=eq.${encodeURIComponent(orderId)}&select=id,status,amount_cents,currency,provider_ref,offers(provider_price_id,payment_type,interval)`);
  if (!order) fail(`Order ${orderId} not found`);
  if (order.status !== "pending") console.warn(`Note: order is ${order.status}; the webhook will ignore it unless it's pending.`);
  const priceId = order.offers?.provider_price_id;
  if (!priceId) fail("The offer has no Paddle price id — set one (e.g. pri_local_test) in Admin → Offers first.");

  const txnId = order.provider_ref ?? `txn_sim_${randomUUID().slice(0, 12)}`;
  if (!order.provider_ref) {
    await db(`orders?id=eq.${order.id}`, { method: "PATCH", body: JSON.stringify({ provider: "paddle", provider_ref: txnId }) });
  }

  const isSubscription = order.offers.payment_type === "subscription";
  const periodEnd = new Date(Date.now() + (order.offers.interval === "year" ? 365 : 31) * 86_400_000).toISOString();
  return {
    event_id: `evt_sim_${randomUUID()}`,
    event_type: "transaction.completed",
    occurred_at: new Date().toISOString(),
    data: {
      id: txnId,
      status: "completed",
      origin: "web",
      subscription_id: isSubscription ? `sub_sim_${randomUUID().slice(0, 12)}` : null,
      currency_code: order.currency,
      custom_data: { order_id: order.id },
      details: { totals: { grand_total: String(order.amount_cents) } },
      items: [{ price: { id: priceId } }],
      billing_period: isSubscription ? { starts_at: new Date().toISOString(), ends_at: periodEnd } : null,
    },
  };
}

const [kind, arg1, arg2] = process.argv.slice(2);
let payload;
if (kind === "paid" && arg1) {
  payload = await paidPayload(arg1);
} else if (kind === "refund" && arg1) {
  payload = {
    event_id: `evt_sim_${randomUUID()}`,
    event_type: "adjustment.updated",
    occurred_at: new Date().toISOString(),
    data: { action: "refund", status: "approved", type: "full", transaction_id: arg1 },
  };
} else if (kind === "raw" && arg1 && arg2) {
  payload = { ...JSON.parse(readFileSync(arg2, "utf8")), event_id: arg1 };
} else {
  fail("Usage: paid <orderId> | refund <txnId> | raw <eventId> <file>");
}

const body = JSON.stringify(payload);
const ts = Math.floor(Date.now() / 1000);
const h1 = createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
const signature = process.env.BAD_SIGNATURE ? `ts=${ts};h1=${"0".repeat(64)}` : `ts=${ts};h1=${h1}`;

const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "Paddle-Signature": signature }, body });
console.log(res.status, await res.text(), `(event ${payload.event_id}${payload.data?.id ? `, txn ${payload.data.id}` : ""})`);
