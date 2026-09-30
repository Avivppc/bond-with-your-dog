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
        details: { totals: { grand_total: "4900", tax: "747" } },
        items: [{ price: { id: "pri_course" }, quantity: 1 }],
        billing_period: null,
        payments: [
          { status: "error", method_details: { type: "card" } },
          { status: "captured", method_details: { type: "paypal" } },
        ],
      },
    });
    expect(event).toEqual({
      kind: "order.paid",
      orderId: order,
      providerRef: "txn_1",
      subscriptionRef: null,
      recurring: false,
      amountCents: 4900,
      taxCents: 747,
      currency: "USD",
      periodEnd: null,
      priceIds: ["pri_course"],
      paymentMethod: "paypal",
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
    expect(event).toMatchObject({
      kind: "order.paid",
      recurring: true,
      subscriptionRef: "sub_1",
      periodEnd: "2026-11-01T00:00:00Z",
      paymentMethod: null,
    });
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

  it("treats a cancellation scheduled for the period end as canceled-at-period-end", () => {
    const event = mapPaddleEvent({
      event_id: "evt_4",
      event_type: "subscription.updated",
      data: {
        id: "sub_1",
        status: "active",
        custom_data: { order_id: order },
        current_billing_period: { starts_at: "2026-10-01T00:00:00Z", ends_at: "2026-11-01T00:00:00Z" },
        canceled_at: null,
        scheduled_change: { action: "cancel", effective_at: "2026-11-01T00:00:00Z" },
      },
    });
    expect(event).toMatchObject({ kind: "subscription.updated", status: "active", canceledAt: "2026-11-01T00:00:00Z" });
  });

  it("maps approved refunds (with their amount) and ignores pending ones and other events", () => {
    expect(
      mapPaddleEvent({
        event_id: "e",
        event_type: "adjustment.updated",
        data: { id: "adj_1", action: "refund", status: "approved", type: "full", transaction_id: "txn_1", totals: { total: "4900", tax: "747" } },
      })
    ).toEqual({ kind: "order.refunded", providerRef: "txn_1", full: true, adjustmentRef: "adj_1", amountCents: 4900, taxCents: 747 });
    expect(
      mapPaddleEvent({ event_id: "e", event_type: "adjustment.updated", data: { id: "adj_2", action: "refund", status: "approved", type: "partial", transaction_id: "txn_1" } })
    ).toEqual({ kind: "order.refunded", providerRef: "txn_1", full: false, adjustmentRef: "adj_2", amountCents: null, taxCents: 0 });
    expect(
      mapPaddleEvent({ event_id: "e", event_type: "adjustment.created", data: { action: "refund", status: "pending_approval", type: "full", transaction_id: "txn_1" } })
    ).toMatchObject({ kind: "ignored" });
    expect(mapPaddleEvent({ event_id: "e", event_type: "customer.created", data: {} })).toMatchObject({ kind: "ignored" });
    expect(mapPaddleEvent({ nonsense: true })).toMatchObject({ kind: "ignored" });
  });
});
