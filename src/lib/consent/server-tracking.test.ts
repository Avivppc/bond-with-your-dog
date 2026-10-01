import { describe, expect, test } from "vitest";
import { isPayingMember, serverTrackingAllowed } from "./server-tracking";

const NOW = new Date("2026-10-01T12:00:00Z");
const LATER = "2027-01-01T00:00:00Z";
const EARLIER = "2026-01-01T00:00:00Z";

describe("isPayingMember", () => {
  test("an active enrollment from a purchase or a subscription counts as paying", () => {
    expect(isPayingMember([{ source: "order", expires_at: null }], NOW)).toBe(true);
    expect(isPayingMember([{ source: "subscription", expires_at: LATER }], NOW)).toBe(true);
  });

  test("free access does not count", () => {
    expect(isPayingMember([{ source: "free", expires_at: null }], NOW)).toBe(false);
    expect(isPayingMember([], NOW)).toBe(false);
  });

  test("an expired paid enrollment no longer counts", () => {
    expect(isPayingMember([{ source: "subscription", expires_at: EARLIER }], NOW)).toBe(false);
  });

  test("one paid enrollment among free ones is enough", () => {
    const enrollments = [
      { source: "free", expires_at: null },
      { source: "order", expires_at: null },
    ];

    expect(isPayingMember(enrollments, NOW)).toBe(true);
  });
});

describe("serverTrackingAllowed", () => {
  test("a member who accepted analytics is tracked", () => {
    expect(serverTrackingAllowed({ requestDecision: "granted", isPaying: false })).toBe(true);
  });

  test("a paying member is tracked even after rejecting cookies (server events use no cookies)", () => {
    expect(serverTrackingAllowed({ requestDecision: "denied", isPaying: true })).toBe(true);
  });

  test("a free member who rejected, or has not chosen yet in a strict region, is not tracked", () => {
    expect(serverTrackingAllowed({ requestDecision: "denied", isPaying: false })).toBe(false);
    expect(serverTrackingAllowed({ requestDecision: "undecided", isPaying: false })).toBe(false);
  });

  test("without the member's own request (e.g. Roni sends feedback), only paying members are tracked", () => {
    expect(serverTrackingAllowed({ requestDecision: null, isPaying: true })).toBe(true);
    expect(serverTrackingAllowed({ requestDecision: null, isPaying: false })).toBe(false);
  });
});
