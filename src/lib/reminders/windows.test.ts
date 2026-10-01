import { describe, expect, test } from "vitest";
import {
  FEEDBACK_OVERDUE_DAYS,
  QA_DAY_OF_HOURS,
  QA_LOOKAHEAD_HOURS,
  UNLOCK_LOOKBACK_HOURS,
  daysWaiting,
  feedbackOverdueCutoff,
  qaStage,
  qaWindow,
  unlockWindow,
} from "./windows";

const NOW = new Date("2026-10-01T06:00:00Z");
const hours = (h: number) => new Date(NOW.getTime() + h * 3_600_000);

describe("unlockWindow", () => {
  test("looks back far enough to cover missed daily runs", () => {
    const w = unlockWindow(NOW);
    expect(w.until).toEqual(NOW);
    expect(w.since).toEqual(hours(-UNLOCK_LOOKBACK_HOURS));
    expect(UNLOCK_LOOKBACK_HOURS).toBeGreaterThanOrEqual(48);
  });
});

describe("qaStage", () => {
  test("past or starting sessions get nothing", () => {
    expect(qaStage(hours(-1), NOW)).toBeNull();
    expect(qaStage(NOW, NOW)).toBeNull();
  });

  test("sessions within the day-of band get the day-of reminder", () => {
    expect(qaStage(hours(1), NOW)).toBe("day_of");
    expect(qaStage(hours(QA_DAY_OF_HOURS), NOW)).toBe("day_of");
  });

  test("sessions in the next band get the day-before reminder", () => {
    expect(qaStage(hours(QA_DAY_OF_HOURS + 1), NOW)).toBe("day_before");
    expect(qaStage(hours(QA_LOOKAHEAD_HOURS), NOW)).toBe("day_before");
    expect(qaStage(hours(QA_LOOKAHEAD_HOURS + 1), NOW)).toBeNull();
  });

  test("daily runs up to an hour late or early still hit both bands", () => {
    // The first run that sees the session finds it somewhere in the day-before band.
    for (let first = QA_DAY_OF_HOURS + 0.5; first <= QA_LOOKAHEAD_HOURS; first += 0.5) {
      for (const gap of [23, 24, 25]) {
        const start = hours(first);
        const stages = [0, 1, 2, 3].map((k) => qaStage(start, hours(k * gap))).filter(Boolean);
        expect(new Set(stages)).toEqual(new Set(["day_before", "day_of"]));
      }
    }
  });

  test("the query window covers both bands", () => {
    const w = qaWindow(NOW);
    expect(w.since).toEqual(NOW);
    expect(w.until).toEqual(hours(QA_LOOKAHEAD_HOURS));
  });
});

describe("feedback overdue", () => {
  test("the cutoff is FEEDBACK_OVERDUE_DAYS ago", () => {
    expect(feedbackOverdueCutoff(NOW)).toEqual(hours(-FEEDBACK_OVERDUE_DAYS * 24));
  });

  test("days waiting are whole days, never negative", () => {
    expect(daysWaiting(hours(-24 * 6 - 5), NOW)).toBe(6);
    expect(daysWaiting(hours(2), NOW)).toBe(0);
  });
});
