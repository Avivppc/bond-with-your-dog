import { describe, expect, it } from "vitest";
import { affiliateCouponPatch, checkAffiliateCouponCode, commissionCents, isAffiliateCode, isOwnPurchase, safeLandingPath, suggestAffiliateCode, suggestCouponCode } from "./rules";

describe("affiliate codes", () => {
  it("accepts lower-case slugs of 3–30 characters", () => {
    expect(isAffiliateCode("dana")).toBe(true);
    expect(isAffiliateCode("dana-levi-2")).toBe(true);
    expect(isAffiliateCode("Da")).toBe(false);
    expect(isAffiliateCode("bad code")).toBe(false);
  });

  it("suggests one from a name", () => {
    expect(suggestAffiliateCode("Dana Levi")).toBe("dana-levi");
    expect(suggestAffiliateCode("Zoë")).toBe("zoe");
    expect(suggestAffiliateCode("Al")).toBe("al-partner");
  });
});

describe("safeLandingPath", () => {
  it("keeps links on our own site", () => {
    expect(safeLandingPath("/chapter/foundations")).toBe("/chapter/foundations");
    expect(safeLandingPath("https://evil.example")).toBe("/courses");
    expect(safeLandingPath("//evil.example")).toBe("/courses");
    expect(safeLandingPath("/\\evil.example")).toBe("/courses");
    expect(safeLandingPath(null)).toBe("/courses");
    expect(safeLandingPath("/\t/evil.example")).toBe("/courses");
    expect(safeLandingPath("/\n/evil.example")).toBe("/courses");
    expect(safeLandingPath("/checkout/moves?code=SPRING20")).toBe("/checkout/moves?code=SPRING20");
  });
});

describe("commissions", () => {
  it("rounds down to the cent", () => {
    expect(commissionCents(10320, 20)).toBe(2064);
    expect(commissionCents(999, 15)).toBe(149);
    expect(commissionCents(0, 20)).toBe(0);
  });

  it("never pays an affiliate for their own purchase", () => {
    const affiliate = { user_id: "u1", email: "Dana@partner.test" };
    expect(isOwnPurchase(affiliate, { id: "u1", email: "x@test" })).toBe(true);
    expect(isOwnPurchase(affiliate, { id: "u2", email: "dana@partner.test " })).toBe(true);
    expect(isOwnPurchase(affiliate, { id: "u2", email: "buyer@test" })).toBe(false);
  });
});

describe("affiliate discount codes", () => {
  it("suggests one from the link code and the discount", () => {
    expect(suggestCouponCode("dana-levi", 10)).toBe("DANALEVI10");
    expect(suggestCouponCode("dana", 15)).toBe("DANA15");
  });

  it("accepts what people type, in any case, without spaces", () => {
    expect(checkAffiliateCouponCode(" dana10 ")).toEqual({ ok: true, code: "DANA10" });
    expect(checkAffiliateCouponCode("dana-10")).toEqual({ ok: true, code: "DANA-10" });
    expect(checkAffiliateCouponCode("Dana 10")).toEqual({ ok: true, code: "DANA10" });
  });

  it("refuses codes that are too short, too long or have other characters", () => {
    expect(checkAffiliateCouponCode("ab").ok).toBe(false);
    expect(checkAffiliateCouponCode("A".repeat(41)).ok).toBe(false);
    expect(checkAffiliateCouponCode("DANA%10").ok).toBe(false);
    expect(checkAffiliateCouponCode("-DANA").ok).toBe(false);
  });

  it("refuses the BOND- prefix, which belongs to members' personal codes", () => {
    expect(checkAffiliateCouponCode("bond-dana").ok).toBe(false);
    expect(checkAffiliateCouponCode("BONDDANA").ok).toBe(true);
  });
});

describe("affiliateCouponPatch", () => {
  const on = { active: true, coupon_percent: 10 };

  it("turns the code off when the affiliate is paused or has no discount", () => {
    expect(affiliateCouponPatch(on, { active: false, coupon_percent: 10 })).toEqual({ percent_off: 10, active: false });
    expect(affiliateCouponPatch(on, { active: true, coupon_percent: null })).toEqual({ active: false });
  });

  it("turns it back on only when the affiliate comes back", () => {
    expect(affiliateCouponPatch({ active: false, coupon_percent: 10 }, on)).toEqual({ percent_off: 10, active: true });
    expect(affiliateCouponPatch({ active: true, coupon_percent: null }, on)).toEqual({ percent_off: 10, active: true });
  });

  it("leaves a code the team switched off alone when other details change", () => {
    expect(affiliateCouponPatch(on, { active: true, coupon_percent: 15 })).toEqual({ percent_off: 15 });
  });
});
