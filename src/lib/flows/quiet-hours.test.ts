import { describe, expect, it } from "vitest";
import { quietHoldUntil } from "./quiet-hours";

describe("quietHoldUntil", () => {
  it("sends right away during the day where the person is", () => {
    expect(quietHoldUntil(new Date("2026-10-03T12:00:00Z"), "Asia/Jerusalem")).toBeNull();
  });

  it("waits for 9:00 local at night", () => {
    // 23:30 in Jerusalem (UTC+3) → 9:00 there is 06:00 UTC the next day.
    expect(quietHoldUntil(new Date("2026-10-03T20:30:00Z"), "Asia/Jerusalem")).toBe("2026-10-04T06:00:00.000Z");
  });

  it("uses the person's own zone (New York evening is fine)", () => {
    expect(quietHoldUntil(new Date("2026-10-03T22:00:00Z"), "America/New_York")).toBeNull();
  });

  it("falls back to UTC for an unknown zone", () => {
    expect(quietHoldUntil(new Date("2026-10-03T03:00:00Z"), "Not/AZone")).toBe("2026-10-03T09:00:00.000Z");
  });
});
