import { describe, expect, it } from "vitest";
import { addOnUsable, applyCoupon, bestDiscount, checkGift, effectivePercent, normalizeCode, orderTotal, retentionLabel, upsellStillOpen, type Coupon } from "./pricing";

const NOW = new Date("2026-10-04T12:00:00Z");
const OFFER = { id: "o1", priceCents: 9900, currency: "USD", paymentType: "one_time" };
const COUPON: Coupon = {
  id: "c1",
  code: "SPRING20",
  percent_off: 20,
  amount_off_cents: null,
  offer_ids: [],
  max_redemptions: null,
  starts_at: null,
  expires_at: null,
  active: true,
};
const CTX = { now: NOW, redemptions: 0, usedByBuyer: false };

describe("applyCoupon", () => {
  it("takes a percentage off, rounding in the buyer's favour", () => {
    expect(applyCoupon(COUPON, { ...OFFER, priceCents: 9999 }, CTX)).toEqual({ ok: true, amountCents: 7999, label: "20% off" });
  });

  it("takes a fixed amount off, never below zero", () => {
    expect(applyCoupon({ ...COUPON, percent_off: null, amount_off_cents: 1500 }, OFFER, CTX)).toMatchObject({ ok: true, amountCents: 8400, label: "$15 off" });
    expect(applyCoupon({ ...COUPON, percent_off: null, amount_off_cents: 50000 }, OFFER, CTX)).toMatchObject({ ok: true, amountCents: 0 });
  });

  it("refuses inactive, early, expired, other-offer, used-up and already-used codes", () => {
    expect(applyCoupon({ ...COUPON, active: false }, OFFER, CTX).ok).toBe(false);
    expect(applyCoupon({ ...COUPON, starts_at: "2026-10-05T00:00:00Z" }, OFFER, CTX).ok).toBe(false);
    expect(applyCoupon({ ...COUPON, expires_at: "2026-10-04T12:00:00Z" }, OFFER, CTX).ok).toBe(false);
    expect(applyCoupon({ ...COUPON, offer_ids: ["other"] }, OFFER, CTX).ok).toBe(false);
    expect(applyCoupon({ ...COUPON, max_redemptions: 3 }, OFFER, { ...CTX, redemptions: 3 }).ok).toBe(false);
    expect(applyCoupon(COUPON, OFFER, { ...CTX, usedByBuyer: true }).ok).toBe(false);
    expect(applyCoupon(COUPON, { ...OFFER, paymentType: "free", priceCents: 0 }, CTX).ok).toBe(false);
  });

  it("works on the offers it lists", () => {
    expect(applyCoupon({ ...COUPON, offer_ids: ["o1"] }, OFFER, CTX).ok).toBe(true);
  });
});

describe("normalizeCode", () => {
  it("ignores case and spaces", () => {
    expect(normalizeCode(" spring 20 ")).toBe("SPRING20");
  });
});

describe("addOnUsable", () => {
  const addOn = { id: "b", status: "published", paymentType: "one_time", priceCents: 4900, currency: "USD" };
  const main = { id: "o1", currency: "USD" };

  it("allows a published one-time add-on at or under its own price", () => {
    expect(addOnUsable({ offerId: "b", priceCents: 2900 }, addOn, main)).toBe(true);
    expect(addOnUsable({ offerId: "b", priceCents: 4900 }, addOn, main)).toBe(true);
  });

  it("refuses drafts, subscriptions, other currencies, itself, and prices above the add-on's", () => {
    expect(addOnUsable({ offerId: "b", priceCents: 2900 }, { ...addOn, status: "draft" }, main)).toBe(false);
    expect(addOnUsable({ offerId: "b", priceCents: 2900 }, { ...addOn, paymentType: "subscription" }, main)).toBe(false);
    expect(addOnUsable({ offerId: "b", priceCents: 2900 }, { ...addOn, currency: "EUR" }, main)).toBe(false);
    expect(addOnUsable({ offerId: "o1", priceCents: 2900 }, { ...addOn, id: "o1" }, main)).toBe(false);
    expect(addOnUsable({ offerId: "b", priceCents: 5900 }, addOn, main)).toBe(false);
    expect(addOnUsable({ offerId: null, priceCents: null }, null, main)).toBe(false);
  });
});

describe("orderTotal / upsellStillOpen / retentionLabel", () => {
  it("adds an accepted bump to the main price", () => {
    expect(orderTotal(7920, 2900)).toBe(10820);
    expect(orderTotal(7920, null)).toBe(7920);
  });

  it("keeps an after-purchase upsell open for 48 hours", () => {
    expect(upsellStillOpen("2026-10-03T12:00:01Z", NOW)).toBe(true);
    expect(upsellStillOpen("2026-10-02T11:59:00Z", NOW)).toBe(false);
    expect(upsellStillOpen(null, NOW)).toBe(false);
  });

  it("describes the offer to stay", () => {
    expect(retentionLabel(50, 1, "month")).toBe("50% off your next month");
    expect(retentionLabel(30, 3, "month")).toBe("30% off your next 3 months");
  });
});

describe("checkGift", () => {
  const gift = { recipientEmail: " Dana@Example.com ", recipientName: "Dana", message: "Enjoy dancing with Rhythm!" };

  it("tidies a valid gift", () => {
    expect(checkGift(gift, "me@example.com")).toEqual({ ok: true, gift: { recipientEmail: "dana@example.com", recipientName: "Dana", message: "Enjoy dancing with Rhythm!" } });
  });

  it("refuses yourself, bad emails, names with links and messages with links", () => {
    expect(checkGift(gift, "dana@example.com").ok).toBe(false);
    expect(checkGift({ ...gift, recipientEmail: "nope" }, "me@example.com").ok).toBe(false);
    expect(checkGift({ ...gift, recipientName: "http://spam" }, "me@example.com").ok).toBe(false);
    expect(checkGift({ ...gift, message: "see www.spam.example" }, "me@example.com").ok).toBe(false);
  });
});

describe("bestDiscount / effectivePercent", () => {
  it("lets an after-purchase upsell price stand alone", () => {
    expect(bestDiscount([{ kind: "coupon", amountCents: 100 }, { kind: "post_purchase", amountCents: 4900 }])?.kind).toBe("post_purchase");
  });

  it("picks the cheapest, preferring a personal code, then a coupon, on a tie", () => {
    expect(bestDiscount([{ kind: "friend", amountCents: 8000 }, { kind: "coupon", amountCents: 7900 }, null])?.kind).toBe("coupon");
    expect(bestDiscount([{ kind: "friend", amountCents: 7900 }, { kind: "coupon", amountCents: 7900 }, { kind: "upsell", amountCents: 7900 }])?.kind).toBe("upsell");
    expect(bestDiscount([null, null])).toBeNull();
  });

  it("turns any discount into a whole percentage", () => {
    expect(effectivePercent(9900, 8400)).toBe(15);
    expect(effectivePercent(9900, 0)).toBe(100);
    expect(effectivePercent(0, 0)).toBe(0);
  });
});
