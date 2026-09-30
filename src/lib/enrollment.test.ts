import { describe, expect, it } from "vitest";
import { isEnrollmentActive } from "./enrollment";

describe("isEnrollmentActive", () => {
  const now = new Date("2026-10-01T12:00:00Z");

  it("treats lifetime and future-dated enrollments as active", () => {
    expect(isEnrollmentActive({ expires_at: null }, now)).toBe(true);
    expect(isEnrollmentActive({ expires_at: "2026-10-02T00:00:00Z" }, now)).toBe(true);
  });

  it("treats ended (refunded, revoked, expired) enrollments and missing rows as inactive", () => {
    expect(isEnrollmentActive({ expires_at: "2026-10-01T11:59:59Z" }, now)).toBe(false);
    expect(isEnrollmentActive(null, now)).toBe(false);
    expect(isEnrollmentActive(undefined, now)).toBe(false);
  });
});
