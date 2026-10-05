import { describe, expect, test } from "vitest";
import { activityHref, activityText, groupActivity, setupWarnings, type ActivityRow, type SetupFacts } from "./admin-dashboard";

const NOW = new Date("2026-10-03T12:00:00Z");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

const HEALTHY: SetupFacts = {
  hasPostalAddress: true,
  failedEmails: 0,
  flows: { lastOkAt: minutesAgo(10), lastErrorAt: null, lastError: null },
  spamProtection: true,
  isProduction: true,
};

describe("setupWarnings", () => {
  test("is empty when everything is set up and running", () => {
    expect(setupWarnings(HEALTHY, NOW)).toEqual([]);
  });

  test("asks for the postal address", () => {
    expect(setupWarnings({ ...HEALTHY, hasPostalAddress: false }, NOW).map((w) => w.key)).toEqual(["postal"]);
  });

  test("flags automations that stopped (no good run for over an hour)", () => {
    const [w] = setupWarnings({ ...HEALTHY, flows: { lastOkAt: minutesAgo(90), lastErrorAt: null, lastError: null } }, NOW);
    expect(w).toMatchObject({ key: "flows", tone: "error", label: "Automations stopped running" });
  });

  test("flags automations whose latest run failed, with the error", () => {
    const [w] = setupWarnings({ ...HEALTHY, flows: { lastOkAt: minutesAgo(20), lastErrorAt: minutesAgo(5), lastError: "send failed" } }, NOW);
    expect(w).toMatchObject({ key: "flows", tone: "error", hint: "send failed" });
  });

  test("an old failure followed by a good run is fine", () => {
    expect(setupWarnings({ ...HEALTHY, flows: { lastOkAt: minutesAgo(5), lastErrorAt: minutesAgo(30), lastError: "x" } }, NOW)).toEqual([]);
  });

  test("a job that never ran is a gentle warning, after the real errors", () => {
    const keys = setupWarnings({ ...HEALTHY, hasPostalAddress: false, failedEmails: 2, flows: null }, NOW).map((w) => [w.key, w.tone]);
    expect(keys).toEqual([
      ["postal", "error"],
      ["failedEmails", "warning"],
      ["flows", "warning"],
    ]);
  });

  test("only production nags about spam protection", () => {
    expect(setupWarnings({ ...HEALTHY, spamProtection: false }, NOW).map((w) => w.key)).toEqual(["spam"]);
    expect(setupWarnings({ ...HEALTHY, spamProtection: false, isProduction: false }, NOW)).toEqual([]);
  });

  test("counts failed emails in the label", () => {
    expect(setupWarnings({ ...HEALTHY, failedEmails: 1 }, NOW)[0].label).toBe("1 email failed this week");
  });
});

const row = (over: Partial<ActivityRow>): ActivityRow => ({
  kind: "lesson",
  at: minutesAgo(0),
  userId: "u1",
  email: "dana@test.dev",
  name: "Dana",
  detail: "Welcome",
  amountCents: null,
  currency: null,
  ...over,
});

describe("groupActivity", () => {
  test("folds a burst of lessons by one person into one item", () => {
    const items = groupActivity([row({ at: minutesAgo(1) }), row({ at: minutesAgo(5) }), row({ at: minutesAgo(9) })], 10);
    expect(items).toHaveLength(1);
    expect(items[0].count).toBe(3);
  });

  test("keeps different people, kinds and far-apart times apart", () => {
    const items = groupActivity(
      [row({ at: minutesAgo(1) }), row({ at: minutesAgo(2), userId: "u2" }), row({ at: minutesAgo(3), userId: "u2", kind: "question" }), row({ at: minutesAgo(120), userId: "u2", kind: "question" })],
      10,
    );
    expect(items.map((i) => [i.userId, i.kind, i.count])).toEqual([
      ["u1", "lesson", 1],
      ["u2", "lesson", 1],
      ["u2", "question", 1],
      ["u2", "question", 1],
    ]);
  });

  test("never folds orders", () => {
    expect(groupActivity([row({ kind: "order" }), row({ kind: "order" })], 10)).toHaveLength(2);
  });

  test("keeps the newest items up to the limit", () => {
    const items = groupActivity([row({ userId: "a" }), row({ userId: "b" }), row({ userId: "c" })], 2);
    expect(items.map((i) => i.userId)).toEqual(["a", "b"]);
  });
});

describe("activityText", () => {
  const money = (cents: number, currency: string) => `${currency} ${cents / 100}`;

  test("describes each kind", () => {
    expect(activityText({ ...row({ kind: "signup" }), count: 1 }, money)).toBe("created an account");
    expect(activityText({ ...row({ kind: "lead", detail: "letsDance" }), count: 1 }, money)).toBe("took the website quiz (Let's Dance)");
    expect(activityText({ ...row({ kind: "order", detail: "Foundations", amountCents: 4900, currency: "USD" }), count: 1 }, money)).toBe("bought Foundations for USD 49");
    expect(activityText({ ...row({}), count: 1 }, money)).toBe("finished “Welcome”");
    expect(activityText({ ...row({}), count: 7 }, money)).toBe("finished 7 lessons");
    expect(activityText({ ...row({ kind: "survey", detail: "Chapter check-in" }), count: 1 }, money)).toBe("answered “Chapter check-in”");
  });

  test("links people to their page and leads to the leads list", () => {
    expect(activityHref({ ...row({}), count: 1 })).toBe("/admin/people/u1");
    expect(activityHref({ ...row({ kind: "lead", userId: null, email: "a+b@x.dev" }), count: 1 })).toBe("/admin/leads?q=a%2Bb%40x.dev");
  });
});
