import { describe, expect, it } from "vitest";
import { DISCOUNT_HOLD_HOURS, chooseDiscount, discountedCents, heldDiscounts, isValidReferralCode, type PendingDiscountOrder } from "./referrals";

describe("heldDiscounts", () => {
  const now = Date.parse("2026-10-01T12:00:00Z");
  const order = (o: Partial<PendingDiscountOrder>): PendingDiscountOrder => ({
    offer_id: "offer-b",
    discount_kind: "friend",
    referral_reward_id: null,
    created_at: "2026-10-01T11:00:00Z",
    ...o,
  });

  it("an unpaid checkout for another offer holds the friend discount and its reward", () => {
    const held = heldDiscounts([order({}), order({ discount_kind: "reward", referral_reward_id: "r1" })], "offer-a", now);
    expect(held.friend).toBe(true);
    expect([...held.rewardIds]).toEqual(["r1"]);
  });

  it("retrying the same offer keeps the discount (same purchase)", () => {
    expect(heldDiscounts([order({ offer_id: "offer-a" })], "offer-a", now).friend).toBe(false);
  });

  it("a hold lapses after DISCOUNT_HOLD_HOURS", () => {
    const old = new Date(now - (DISCOUNT_HOLD_HOURS + 1) * 3_600_000).toISOString();
    expect(heldDiscounts([order({ created_at: old })], "offer-a", now).friend).toBe(false);
  });
});

describe("chooseDiscount", () => {
  it("gives a referred friend their first-purchase discount", () => {
    expect(chooseDiscount({ friendPercent: 20, reward: null })).toEqual({ kind: "friend", percent: 20, rewardId: null });
  });

  it("uses the referrer's reward when there's no friend discount", () => {
    expect(chooseDiscount({ friendPercent: null, reward: { id: "r1", percent: 15 } })).toEqual({ kind: "reward", percent: 15, rewardId: "r1" });
  });

  it("never stacks: the bigger one wins, a tie keeps the reward for later", () => {
    expect(chooseDiscount({ friendPercent: 10, reward: { id: "r1", percent: 25 } })).toMatchObject({ kind: "reward", percent: 25 });
    expect(chooseDiscount({ friendPercent: 20, reward: { id: "r1", percent: 20 } })).toMatchObject({ kind: "friend" });
  });

  it("ignores zero percents and returns null when nothing applies", () => {
    expect(chooseDiscount({ friendPercent: 0, reward: { id: "r1", percent: 0 } })).toBeNull();
    expect(chooseDiscount({ friendPercent: null, reward: null })).toBeNull();
  });
});

describe("discountedCents", () => {
  it("takes the percentage off and rounds to whole cents", () => {
    expect(discountedCents(8900, 20)).toBe(7120);
    expect(discountedCents(999, 15)).toBe(849);
    expect(discountedCents(8900, 0)).toBe(8900);
    expect(discountedCents(8900, 100)).toBe(0);
  });
});

describe("isValidReferralCode", () => {
  it("accepts the generated format only", () => {
    expect(isValidReferralCode("ab12cd34")).toBe(true);
    expect(isValidReferralCode("AB12CD34")).toBe(false);
    expect(isValidReferralCode("x")).toBe(false);
    expect(isValidReferralCode("../../etc")).toBe(false);
  });
});
