#!/usr/bin/env node
// Sends a correctly signed Paddle Billing webhook to a LOCAL dev server — exercises the
// real /api/webhooks/paddle route (signature check, idempotency, fulfillment/refund).
//
// Usage:
//   node scripts/simulate-paddle-webhook.mjs paid <orderId> [txnId]
//   node scripts/simulate-paddle-webhook.mjs refund <txnId>
//   node scripts/simulate-paddle-webhook.mjs raw <eventId> <json-file>
// Env: PADDLE_WEBHOOK_SECRET (from .env.local), WEBHOOK_URL (default http://localhost:3100/api/webhooks/paddle)
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const url = process.env.WEBHOOK_URL ?? "http://localhost:3100/api/webhooks/paddle";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url)) {
  console.error("Refusing to send simulated webhooks to a non-local URL");
  process.exit(1);
}
const secret = process.env.PADDLE_WEBHOOK_SECRET;
if (!secret) {
  console.error("PADDLE_WEBHOOK_SECRET is not set");
  process.exit(1);
}

const [kind, arg1, arg2] = process.argv.slice(2);
let payload;
if (kind === "paid") {
  payload = {
    event_id: `evt_sim_${randomUUID()}`,
    event_type: "transaction.completed",
    occurred_at: new Date().toISOString(),
    data: {
      id: arg2 ?? `txn_sim_${randomUUID().slice(0, 8)}`,
      status: "completed",
      origin: "web",
      subscription_id: null,
      currency_code: "USD",
      custom_data: { order_id: arg1 },
      details: { totals: { grand_total: "8900" } },
      billing_period: null,
    },
  };
} else if (kind === "refund") {
  payload = {
    event_id: `evt_sim_${randomUUID()}`,
    event_type: "adjustment.updated",
    occurred_at: new Date().toISOString(),
    data: { action: "refund", status: "approved", type: "full", transaction_id: arg1 },
  };
} else if (kind === "raw") {
  payload = { ...JSON.parse(readFileSync(arg2, "utf8")), event_id: arg1 };
} else {
  console.error("Usage: paid <orderId> [txnId] | refund <txnId> | raw <eventId> <file>");
  process.exit(1);
}

const body = JSON.stringify(payload);
const ts = Math.floor(Date.now() / 1000);
const h1 = createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
const signature = process.env.BAD_SIGNATURE ? `ts=${ts};h1=${"0".repeat(64)}` : `ts=${ts};h1=${h1}`;

const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "Paddle-Signature": signature }, body });
console.log(res.status, await res.text(), `(event ${payload.event_id})`);
