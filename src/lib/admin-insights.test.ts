import { describe, expect, it } from "vitest";
import { insightsSchema, share, trend } from "./admin-insights";

describe("trend", () => {
  it("says how the last 30 days compare with the 30 before", () => {
    expect(trend(5, 2)).toBe("+3 vs the 30 days before");
    expect(trend(1, 3)).toBe("−2 vs the 30 days before");
    expect(trend(4, 4)).toBe("No change vs the 30 days before");
  });
});

describe("share", () => {
  it("rounds to a whole percent and never divides by zero", () => {
    expect(share(1, 3)).toBe("33%");
    expect(share(0, 0)).toBe("0%");
  });
});

describe("insightsSchema", () => {
  it("reads the database numbers (bigints arrive as numbers or strings)", () => {
    const parsed = insightsSchema.parse({
      contacts: { total: "12", members: 9, leads: 3, new30: 2, newPrev30: 1 },
      customers: { total: 4, new30: 1, newPrev30: 0, active30: 3 },
      subscribers: { total: 7, notConsented: 4, new30: 1 },
      unsubscribed: { total: 1, link30: 1, complaint30: 0, bounce30: 0 },
      engagement: { healthy: 5, atRisk: 1, inactive: 1 },
    });
    expect(parsed.contacts.total).toBe(12);
  });

  it("treats a bad value as zero rather than failing the page", () => {
    const parsed = insightsSchema.parse({
      contacts: { total: -1, members: null, leads: 0, new30: 0, newPrev30: 0 },
      customers: { total: 0, new30: 0, newPrev30: 0, active30: 0 },
      subscribers: { total: 0, notConsented: 0, new30: 0 },
      unsubscribed: { total: 0, link30: 0, complaint30: 0, bounce30: 0 },
      engagement: { healthy: 0, atRisk: 0, inactive: 0 },
    });
    expect(parsed.contacts.total).toBe(0);
  });
});
