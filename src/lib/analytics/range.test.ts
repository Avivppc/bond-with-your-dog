import { describe, expect, it } from "vitest";
import { percentChange, resolveRange } from "./range";

const NOW = new Date("2026-10-15T13:45:00Z");

describe("resolveRange", () => {
  it("defaults to the last 30 days (whole days, ending today) with a daily chart", () => {
    const r = resolveRange({}, NOW);
    expect(r.key).toBe("30d");
    expect(r.to.toISOString()).toBe("2026-10-16T00:00:00.000Z");
    expect(r.from.toISOString()).toBe("2026-09-16T00:00:00.000Z");
    expect(r.bucket).toBe("day");
  });

  it("compares with the period of the same length right before", () => {
    const r = resolveRange({ range: "7d" }, NOW);
    expect(r.previous.to.toISOString()).toBe(r.from.toISOString());
    expect(r.previous.from.toISOString()).toBe("2026-10-02T00:00:00.000Z");
  });

  it("uses weekly buckets for a quarter and monthly ones for a year", () => {
    expect(resolveRange({ range: "90d" }, NOW).bucket).toBe("week");
    const year = resolveRange({ range: "12m" }, NOW);
    expect(year.bucket).toBe("month");
    expect(year.from.toISOString()).toBe("2025-11-01T00:00:00.000Z");
  });

  it("accepts a custom from/to (inclusive days) and ignores nonsense", () => {
    const custom = resolveRange({ from: "2026-01-01", to: "2026-01-31" }, NOW);
    expect(custom.key).toBe("custom");
    expect(custom.from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(custom.to.toISOString()).toBe("2026-02-01T00:00:00.000Z");
    expect(resolveRange({ from: "2026-02-10", to: "2026-01-01" }, NOW).key).toBe("30d");
    expect(resolveRange({ range: "forever" }, NOW).key).toBe("30d");
  });
});

describe("percentChange", () => {
  it("is null when there's nothing to compare against", () => {
    expect(percentChange(10, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });

  it("rounds to whole percents", () => {
    expect(percentChange(150, 100)).toBe(50);
    expect(percentChange(50, 150)).toBe(-67);
  });
});
