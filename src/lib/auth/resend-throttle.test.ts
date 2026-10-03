import { describe, expect, test } from "vitest";
import { nextResend, RESEND_COOLDOWN_MS, RESEND_DAILY_LIMIT } from "./resend-throttle";

const NOW = Date.parse("2026-10-01T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

describe("nextResend", () => {
  test("allows the first link and records it", () => {
    expect(nextResend([], NOW)).toEqual({ allowed: true, history: [new Date(NOW).toISOString()] });
  });

  test("blocks a resend inside the cooldown and says how long to wait", () => {
    expect(nextResend([ago(30_000)], NOW)).toEqual({
      allowed: false,
      retryInSeconds: Math.ceil((RESEND_COOLDOWN_MS - 30_000) / 1000),
    });
  });

  test("allows a resend once the cooldown has passed", () => {
    expect(nextResend([ago(RESEND_COOLDOWN_MS + 1)], NOW).allowed).toBe(true);
  });

  test("caps sends per day and forgets sends older than a day", () => {
    const hour = 3_600_000;
    const full = Array.from({ length: RESEND_DAILY_LIMIT }, (_, i) => ago((i + 1) * hour));
    expect(nextResend(full, NOW).allowed).toBe(false);

    const stale = Array.from({ length: RESEND_DAILY_LIMIT }, (_, i) => ago(25 * hour + i));
    expect(nextResend(stale, NOW)).toEqual({ allowed: true, history: [new Date(NOW).toISOString()] });
  });

  test("ignores unreadable timestamps", () => {
    expect(nextResend(["nope", 42 as unknown as string], NOW).allowed).toBe(true);
  });
});
