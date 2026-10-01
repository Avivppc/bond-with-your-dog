import { describe, expect, test } from "vitest";
import { TimeZoneInput, normalizeTimeZone, timeZoneOptions } from "./timezone-input";

describe("normalizeTimeZone", () => {
  test("accepts real IANA zones in canonical form", () => {
    expect(normalizeTimeZone("Asia/Jerusalem")).toBe("Asia/Jerusalem");
    expect(normalizeTimeZone(" asia/jerusalem ")).toBe("Asia/Jerusalem");
    expect(normalizeTimeZone("America/Argentina/Buenos_Aires")).toMatch(/Buenos_Aires$/);
    expect(normalizeTimeZone("UTC")).toBe("UTC");
  });

  test("rejects junk", () => {
    expect(normalizeTimeZone("Mars/Base")).toBeNull();
    expect(normalizeTimeZone("")).toBeNull();
    expect(normalizeTimeZone("../../etc")).toBeNull();
    expect(normalizeTimeZone(42)).toBeNull();
  });
});

test("TimeZoneInput validates and normalizes", () => {
  expect(TimeZoneInput.safeParse("Europe/London")).toEqual({ success: true, data: "Europe/London" });
  expect(TimeZoneInput.safeParse("Nowhere").success).toBe(false);
  expect(TimeZoneInput.safeParse("x".repeat(65)).success).toBe(false);
});

test("timeZoneOptions is sorted, unique and includes UTC and the saved zone", () => {
  const options = timeZoneOptions("Asia/Jerusalem");
  expect(options).toContain("UTC");
  expect(options).toContain("Asia/Jerusalem");
  expect(new Set(options).size).toBe(options.length);
  expect([...options].sort((a, b) => a.localeCompare(b))).toEqual(options);
});
