import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  hourInZone,
  isIsoDate,
  isoDateInZone,
  isValidTimeZone,
  mondayOf,
  parseMonth,
  shiftMonth,
  shortDayLabel,
  weekdayOf,
  daysInMonth,
  longDateLabel,
} from "./dates";
import { currentStreak, longestStreak } from "./streaks";

describe("dates", () => {
  it("validates ISO dates strictly", () => {
    expect(isIsoDate("2026-09-30")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("30-09-2026")).toBe(false);
  });

  it("adds days across month and year ends", () => {
    expect(addDays("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-09-28", "2026-10-04")).toBe(6);
  });

  it("finds the Monday of a week (weeks start on Monday)", () => {
    expect(weekdayOf("2026-10-01")).toBe(4); // Thursday
    expect(mondayOf("2026-10-01")).toBe("2026-09-28");
    expect(mondayOf("2026-10-04")).toBe("2026-09-28"); // Sunday belongs to the week before
    expect(mondayOf("2026-09-28")).toBe("2026-09-28");
  });

  it("reads the calendar date and hour in a time zone", () => {
    const instant = new Date("2026-10-01T22:30:00Z");
    expect(isoDateInZone(instant, "UTC")).toBe("2026-10-01");
    expect(isoDateInZone(instant, "Asia/Jerusalem")).toBe("2026-10-02");
    expect(isoDateInZone(instant, "Not/AZone")).toBe("2026-10-01");
    expect(hourInZone(instant, "America/New_York")).toBe(18);
    expect(isValidTimeZone("Europe/Berlin")).toBe(true);
    expect(isValidTimeZone("")).toBe(false);
  });

  it("parses and shifts months", () => {
    const fallback = { year: 2026, month: 10 };
    expect(parseMonth("2026-09", fallback)).toEqual({ year: 2026, month: 9 });
    expect(parseMonth("2026-13", fallback)).toEqual(fallback);
    expect(parseMonth(undefined, fallback)).toEqual(fallback);
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(daysInMonth({ year: 2028, month: 2 })).toBe(29);
  });

  it("formats day labels", () => {
    expect(shortDayLabel("2026-09-28")).toBe("Mon 28");
    expect(longDateLabel("2026-09-02")).toBe("September 2");
  });
});

describe("streaks", () => {
  it("returns 0 with no practice", () => {
    expect(longestStreak([])).toBe(0);
    expect(currentStreak([], "2026-10-01")).toBe(0);
  });

  it("finds the longest run of consecutive days, ignoring duplicates and order", () => {
    const days = ["2026-09-03", "2026-09-01", "2026-09-02", "2026-09-02", "2026-09-10", "2026-09-11"];
    expect(longestStreak(days)).toBe(3);
  });

  it("keeps the current streak alive until the end of today", () => {
    const days = ["2026-09-28", "2026-09-29", "2026-09-30"];
    expect(currentStreak(days, "2026-09-30")).toBe(3);
    expect(currentStreak(days, "2026-10-01")).toBe(3);
    expect(currentStreak(days, "2026-10-02")).toBe(0);
  });
});
