import { describe, expect, it } from "vitest";
import { commissionCents, isAffiliateCode, isOwnPurchase, safeLandingPath, suggestAffiliateCode } from "./rules";

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
