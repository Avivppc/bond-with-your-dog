import { describe, expect, test } from "vitest";
import { LIMITS, RATE_WINDOW_MS, rateLimitDecision, windowStart } from "./rate-limit";
import { cleanPage, hashIp, validVisitorId } from "./identity";

const counts = (user = 0, visitor = 0, ip = 0) => ({ user, visitor, ip });

describe("rateLimitDecision", () => {
  test("members get 40 questions a day", () => {
    expect(rateLimitDecision("member", counts(LIMITS.memberPerDay - 1))).toEqual({ allowed: true });
    expect(rateLimitDecision("member", counts(LIMITS.memberPerDay)).allowed).toBe(false);
  });

  test("members aren't limited by visitor or IP counts", () => {
    expect(rateLimitDecision("member", counts(0, 999, 999))).toEqual({ allowed: true });
  });

  test("visitors get 15 a day per cookie", () => {
    expect(rateLimitDecision("sales", counts(0, LIMITS.visitorPerDay - 1, 0))).toEqual({ allowed: true });
    expect(rateLimitDecision("sales", counts(0, LIMITS.visitorPerDay, 0)).allowed).toBe(false);
  });

  test("visitors also share 60 a day per IP (cookie clearing doesn't help)", () => {
    expect(rateLimitDecision("sales", counts(0, 0, LIMITS.ipPerDay - 1))).toEqual({ allowed: true });
    const blocked = rateLimitDecision("sales", counts(0, 0, LIMITS.ipPerDay));
    expect(blocked.allowed).toBe(false);
    expect(blocked.allowed ? "" : blocked.message).toMatch(/today/);
  });

  test("the window is the last 24 hours", () => {
    const now = new Date("2026-10-03T12:00:00Z");
    expect(now.getTime() - windowStart(now).getTime()).toBe(RATE_WINDOW_MS);
  });
});

describe("visitor identity", () => {
  test("hashIp is stable, salted, and never the raw IP", () => {
    const a = hashIp("203.0.113.9", "salt");
    expect(a).toBe(hashIp("203.0.113.9", "salt"));
    expect(a).not.toBe(hashIp("203.0.113.9", "other"));
    expect(a).not.toContain("203.0.113.9");
    expect(hashIp(null, "salt")).toMatch(/^[0-9a-f]{64}$/);
  });

  test("only well-formed cookie ids are trusted", () => {
    expect(validVisitorId("4f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f")).toBe("4f1c2b8e-1d2a-4c3b-9e8f-0a1b2c3d4e5f");
    expect(validVisitorId("not-a-uuid")).toBeNull();
    expect(validVisitorId(undefined)).toBeNull();
  });

  test("cleanPage keeps same-site paths without the query", () => {
    expect(cleanPage("/chapter/moves?utm=x#top")).toBe("/chapter/moves");
    expect(cleanPage("https://evil.example/")).toBeNull();
    expect(cleanPage("//evil.example")).toBeNull();
    expect(cleanPage(undefined)).toBeNull();
  });
});
