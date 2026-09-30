import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { mapPaddleEvent, verifyPaddleSignature } from "./paddle-webhook";

const SECRET = "pdl_ntfset_test_secret";
const sign = (body: string, ts: number, secret = SECRET) =>
  `ts=${ts};h1=${createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex")}`;

describe("verifyPaddleSignature", () => {
  const body = JSON.stringify({ event_id: "evt_1" });
  const now = 1_790_000_000;

  it("accepts a correctly signed, fresh payload", () => {
    expect(verifyPaddleSignature(body, sign(body, now), SECRET, now * 1000)).toBe(true);
  });

  it("accepts any matching h1 (secret rotation sends several)", () => {
    const header = `ts=${now};h1=deadbeef;h1=${sign(body, now).split("h1=")[1]}`;
    expect(verifyPaddleSignature(body, header, SECRET, now * 1000)).toBe(true);
  });

  it("rejects tampered bodies, wrong secrets, stale or malformed headers", () => {
    expect(verifyPaddleSignature(body + " ", sign(body, now), SECRET, now * 1000)).toBe(false);
    expect(verifyPaddleSignature(body, sign(body, now, "other"), SECRET, now * 1000)).toBe(false);
    expect(verifyPaddleSignature(body, sign(body, now - 600), SECRET, now * 1000)).toBe(false);
    expect(verifyPaddleSignature(body, "garbage", SECRET, now * 1000)).toBe(false);
    expect(verifyPaddleSignature(body, null, SECRET, now * 1000)).toBe(false);
    expect(verifyPaddleSignature(body, sign(body, now), "", now * 1000)).toBe(false);
  });
});

describe("mapPaddleEvent", () => {
  const order = "11111111-1111-1111-1111-111111111111";

  it("maps a completed one-time transaction to order.paid", () => {
    const event = mapPaddleEvent({
      event_id: "evt_1",
      event_type: "transaction.completed",
      data: {
        id: "txn_1",
        origin: "web",
        subscription_id: null,
        currency_code: "USD",
        custom_data: { order_id: order },
        details: { totals: { grand_total: "4900" } },
        billing_period: null,
      },
    });
    expect(event).toEqual({
      kind: "order.paid",
      orderId: order,
      providerRef: "txn_1",
      subscriptionRef: null,
      recurring: false,
      amountCents: 4900,
      currency: "USD",
      periodEnd: null,
    });
  });

  it("flags subscription renewals as recurring and carries the period end", () => {
    const event = mapPaddleEvent({
      event_id: "evt_2",
      event_type: "transaction.completed",
      data: {
        id: "txn_2",
        origin: "subscription_recurring",
        subscription_id: "sub_1",
        currency_code: "USD",
        custom_data: null,
        details: { totals: { grand_total: "1900" } },
        billing_period: { starts_at: "2026-10-01T00:00:00Z", ends_at: "2026-11-01T00:00:00Z" },
      },
    });
    expect(event).toMatchObject({ kind: "order.paid", recurring: true, subscriptionRef: "sub_1", periodEnd: "2026-11-01T00:00:00Z" });
  });

  it("maps subscription lifecycle events", () => {
    const event = mapPaddleEvent({
      event_id: "evt_3",
      event_type: "subscription.canceled",
      data: {
        id: "sub_1",
        status: "canceled",
        custom_data: { order_id: order },
        current_billing_period: null,
        canceled_at: "2026-11-01T00:00:00Z",
      },
    });
    expect(event).toEqual({
      kind: "subscription.updated",
      subscriptionRef: "sub_1",
      orderId: order,
      status: "canceled",
      periodEnd: null,
      canceledAt: "2026-11-01T00:00:00Z",
    });
  });

  it("maps approved refunds and ignores pending ones and other events", () => {
    expect(
      mapPaddleEvent({ event_id: "e", event_type: "adjustment.updated", data: { action: "refund", status: "approved", type: "full", transaction_id: "txn_1" } })
    ).toEqual({ kind: "order.refunded", providerRef: "txn_1", full: true });
    expect(
      mapPaddleEvent({ event_id: "e", event_type: "adjustment.created", data: { action: "refund", status: "pending_approval", type: "full", transaction_id: "txn_1" } })
    ).toMatchObject({ kind: "ignored" });
    expect(mapPaddleEvent({ event_id: "e", event_type: "customer.created", data: {} })).toMatchObject({ kind: "ignored" });
    expect(mapPaddleEvent({ nonsense: true })).toMatchObject({ kind: "ignored" });
  });
});
