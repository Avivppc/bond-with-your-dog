import { describe, expect, it } from "vitest";
import { chooseDiscount, discountedCents, isValidReferralCode } from "./referrals";

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
