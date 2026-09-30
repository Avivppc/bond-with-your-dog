import { describe, expect, test } from "vitest";
import { accessKind, canCancelSubscription, formatMoney, offersNotOwned, orderStatusPill, subscriptionPhase } from "./membership";

const NOW = new Date("2026-10-01T00:00:00Z");

test("accessKind: lifetime, until a date, expired", () => {
  expect(accessKind({ expires_at: null }, NOW)).toBe("lifetime");
  expect(accessKind({ expires_at: "2026-11-01T00:00:00Z" }, NOW)).toBe("until");
  expect(accessKind({ expires_at: "2026-09-01T00:00:00Z" }, NOW)).toBe("expired");
});

test("formatMoney", () => {
  expect(formatMoney(8900, "USD")).toBe("$89.00");
  expect(formatMoney(0, "USD")).toBe("Free");
  expect(formatMoney(1250, "EUR")).toBe("€12.50");
});

test("orderStatusPill includes refunds", () => {
  expect(orderStatusPill("paid")).toEqual({ tone: "reliable", label: "Paid" });
  expect(orderStatusPill("refunded").label).toBe("Refunded");
  expect(orderStatusPill("failed").tone).toBe("danger");
});

describe("subscriptions", () => {
  const base = { status: "active" as const, current_period_end: "2026-11-01T00:00:00Z", canceled_at: null };

  test("phase", () => {
    expect(subscriptionPhase(base)).toBe("renews");
    expect(subscriptionPhase({ ...base, canceled_at: "2026-10-01T00:00:00Z" })).toBe("ends");
    expect(subscriptionPhase({ ...base, status: "past_due" })).toBe("past_due");
    expect(subscriptionPhase({ ...base, status: "canceled" })).toBe("canceled");
  });

  test("cancel is offered only while it renews", () => {
    expect(canCancelSubscription(base)).toBe(true);
    expect(canCancelSubscription({ ...base, canceled_at: "2026-10-01T00:00:00Z" })).toBe(false);
    expect(canCancelSubscription({ ...base, status: "canceled" })).toBe(false);
  });
});

test("offersNotOwned hides offers the member already has", () => {
  const offers = [
    { id: "owned", courses: [{ course_id: "a", access_level: "full" as const }] },
    { id: "upgrade", courses: [{ course_id: "b", access_level: "full" as const }] },
    { id: "new", courses: [{ course_id: "c", access_level: "full" as const }] },
    { id: "empty", courses: [] },
  ];
  const enrollments = [
    { course_id: "a", expires_at: null, access_level: "full" as const },
    { course_id: "b", expires_at: null, access_level: "limited" as const },
    { course_id: "c", expires_at: "2026-09-01T00:00:00Z", access_level: "full" as const },
  ];
  expect(offersNotOwned(offers, enrollments, NOW).map((o) => o.id)).toEqual(["upgrade", "new"]);
});
