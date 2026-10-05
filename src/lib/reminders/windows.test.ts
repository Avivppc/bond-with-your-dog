import { describe, expect, test } from "vitest";
import { QA_LOOKAHEAD_HOURS, UNLOCK_LOOKBACK_HOURS, daysWaiting, feedbackOverdueCutoff, liveStage, pastLocalHour, qaWindow, unlockWindow, type LiveTiming } from "./windows";

const NOW = new Date("2026-10-01T06:00:00Z");
const hours = (h: number) => new Date(NOW.getTime() + h * 3_600_000);
const TIMING: LiveTiming = { dayBefore: true, dayBeforeHour: 18, dayOf: true, hoursBefore: 2 };

describe("unlockWindow", () => {
  test("looks back far enough to cover missed runs", () => {
    const w = unlockWindow(NOW);
    expect(w.until).toEqual(NOW);
    expect(w.since).toEqual(hours(-UNLOCK_LOOKBACK_HOURS));
  });
});

describe("liveStage", () => {
  test("past or starting sessions get nothing", () => {
    expect(liveStage(hours(-1), NOW, "UTC", TIMING)).toBeNull();
    expect(liveStage(NOW, NOW, "UTC", TIMING)).toBeNull();
  });

  test("the day-of reminder comes the chosen hours before the start", () => {
    expect(liveStage(hours(2), NOW, "UTC", TIMING)).toBe("day_of");
    expect(liveStage(hours(3), NOW, "UTC", TIMING)).toBeNull();
    expect(liveStage(hours(1), NOW, "UTC", { ...TIMING, dayOf: false })).toBeNull();
  });

  test("the day-before reminder: tomorrow in the member's calendar, from the chosen hour", () => {
    const tomorrowEvening = new Date("2026-10-02T19:00:00Z");
    expect(liveStage(tomorrowEvening, new Date("2026-10-01T17:00:00Z"), "UTC", TIMING)).toBeNull();
    expect(liveStage(tomorrowEvening, new Date("2026-10-01T18:00:00Z"), "UTC", TIMING)).toBe("day_before");
    expect(liveStage(tomorrowEvening, new Date("2026-10-01T18:00:00Z"), "UTC", { ...TIMING, dayBefore: false })).toBeNull();
    // 18:00 UTC is already 21:00 in Jerusalem (past 18) but only 11:00 in Los Angeles.
    expect(liveStage(tomorrowEvening, new Date("2026-10-01T15:30:00Z"), "Asia/Jerusalem", TIMING)).toBe("day_before");
    expect(liveStage(tomorrowEvening, new Date("2026-10-01T18:00:00Z"), "America/Los_Angeles", TIMING)).toBeNull();
  });

  test("no day-before reminder when the day-of one is about to follow", () => {
    const longLead = { ...TIMING, dayBeforeHour: 18, hoursBefore: 12 };
    // 06:30 start; at 18:00 the day before it is 12.5 hours away: day-of comes next hour, so skip.
    expect(liveStage(new Date("2026-10-02T06:30:00Z"), new Date("2026-10-01T18:00:00Z"), "UTC", longLead)).toBeNull();
    expect(liveStage(new Date("2026-10-02T06:30:00Z"), new Date("2026-10-01T18:30:00Z"), "UTC", longLead)).toBe("day_of");
  });

  test("the query window covers the day before", () => {
    expect(qaWindow(NOW)).toEqual({ since: NOW, until: hours(QA_LOOKAHEAD_HOURS) });
  });
});

describe("feedback overdue and hours", () => {
  test("the cutoff is the chosen number of days ago", () => {
    expect(feedbackOverdueCutoff(NOW, 5)).toEqual(hours(-5 * 24));
  });

  test("days waiting are whole days, never negative", () => {
    expect(daysWaiting(hours(-24 * 6 - 5), NOW)).toBe(6);
    expect(daysWaiting(hours(2), NOW)).toBe(0);
  });

  test("pastLocalHour looks at the member's clock", () => {
    expect(pastLocalHour(NOW, "UTC", 9)).toBe(false);
    expect(pastLocalHour(NOW, "Asia/Jerusalem", 9)).toBe(true);
  });
});
