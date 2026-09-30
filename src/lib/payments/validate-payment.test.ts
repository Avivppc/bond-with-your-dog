import { describe, expect, it } from "vitest";
import { validatePayment } from "./validate-payment";

const order = { currency: "USD" };
const oneTime = { payment_type: "one_time" as const, provider_price_id: "pri_course" };
const monthly = { payment_type: "subscription" as const, provider_price_id: "pri_month" };
const paid = { currency: "USD", priceIds: ["pri_course"], subscriptionRef: null, periodEnd: null };

describe("validatePayment", () => {
  it("accepts a payment for exactly the offer's price", () => {
    expect(validatePayment(order, oneTime, paid)).toBeNull();
  });

  it("rejects paying a different (e.g. cheaper) price for this order", () => {
    expect(validatePayment(order, oneTime, { ...paid, priceIds: ["pri_cheap"] })).toMatch(/price/i);
    expect(validatePayment(order, oneTime, { ...paid, priceIds: [] })).toMatch(/price/i);
  });

  it("rejects a currency mismatch", () => {
    expect(validatePayment(order, oneTime, { ...paid, currency: "EUR" })).toMatch(/currency/i);
  });

  it("requires a subscription and billing period for subscription offers (never lifetime by accident)", () => {
    expect(validatePayment(order, monthly, { ...paid, priceIds: ["pri_month"] })).toMatch(/subscription/i);
    expect(
      validatePayment(order, monthly, { ...paid, priceIds: ["pri_month"], subscriptionRef: "sub_1", periodEnd: "2026-11-01T00:00:00Z" })
    ).toBeNull();
  });

  it("rejects offers that were never linked to a provider price", () => {
    expect(validatePayment(order, { ...oneTime, provider_price_id: null }, paid)).toMatch(/price/i);
  });
});
