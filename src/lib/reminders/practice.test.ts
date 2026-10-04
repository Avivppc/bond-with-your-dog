import { describe, expect, test } from "vitest";
import { practiceReminderDue, practiceTarget, type PracticeMember, type PracticeTiming } from "./practice";

// 2026-10-01 is a Thursday (weekday 4).
const THURSDAY_0900_UTC = new Date("2026-10-01T09:00:00Z");
const MORNING: PracticeTiming = { when: "day_of", hour: 9 };
const EVENING_BEFORE: PracticeTiming = { when: "day_before", hour: 18 };

function member(overrides: Partial<PracticeMember> = {}): PracticeMember {
  return { timezone: "UTC", practiceDays: [4], practicedOn: [], hasCourses: true, wantsReminders: true, ...overrides };
}

describe("practiceTarget", () => {
  test("nothing before the chosen hour in the member's zone, today from it", () => {
    expect(practiceTarget(new Date("2026-10-01T08:59:00Z"), "UTC", MORNING)).toBeNull();
    expect(practiceTarget(THURSDAY_0900_UTC, "UTC", MORNING)).toEqual({ date: "2026-10-01", when: "today" });
    // 09:00 UTC is 12:00 in Jerusalem (past 9) but 02:00 in Los Angeles (not yet).
    expect(practiceTarget(THURSDAY_0900_UTC, "Asia/Jerusalem", MORNING)).toEqual({ date: "2026-10-01", when: "today" });
    expect(practiceTarget(THURSDAY_0900_UTC, "America/Los_Angeles", MORNING)).toBeNull();
  });

  test("the evening-before setting looks at tomorrow", () => {
    expect(practiceTarget(new Date("2026-10-01T17:00:00Z"), "UTC", EVENING_BEFORE)).toBeNull();
    expect(practiceTarget(new Date("2026-10-01T18:30:00Z"), "UTC", EVENING_BEFORE)).toEqual({ date: "2026-10-02", when: "tomorrow" });
  });

  test("falls back to UTC for a missing or unknown zone", () => {
    expect(practiceTarget(THURSDAY_0900_UTC, null, MORNING)).toEqual({ date: "2026-10-01", when: "today" });
    expect(practiceTarget(THURSDAY_0900_UTC, "Mars/Olympus_Mons", MORNING)).toEqual({ date: "2026-10-01", when: "today" });
  });
});

describe("practiceReminderDue", () => {
  test("reminds a member on one of their practice days", () => {
    expect(practiceReminderDue(member(), THURSDAY_0900_UTC, MORNING)).toEqual({ date: "2026-10-01", when: "today" });
  });

  test("skips days that aren't practice days, and members who already practiced", () => {
    expect(practiceReminderDue(member({ practiceDays: [1, 3, 6] }), THURSDAY_0900_UTC, MORNING)).toBeNull();
    expect(practiceReminderDue(member({ practicedOn: ["2026-10-01"] }), THURSDAY_0900_UTC, MORNING)).toBeNull();
    expect(practiceReminderDue(member({ practicedOn: ["2026-09-30"] }), THURSDAY_0900_UTC, MORNING)).not.toBeNull();
  });

  test("respects the member's switch and needs an active course", () => {
    expect(practiceReminderDue(member({ wantsReminders: false }), THURSDAY_0900_UTC, MORNING)).toBeNull();
    expect(practiceReminderDue(member({ hasCourses: false }), THURSDAY_0900_UTC, MORNING)).toBeNull();
  });

  test("the evening before checks tomorrow's weekday", () => {
    const wednesdayEvening = new Date("2026-09-30T19:00:00Z");
    expect(practiceReminderDue(member({ practiceDays: [4] }), wednesdayEvening, EVENING_BEFORE)).toEqual({ date: "2026-10-01", when: "tomorrow" });
    expect(practiceReminderDue(member({ practiceDays: [3] }), wednesdayEvening, EVENING_BEFORE)).toBeNull();
  });

  test("later runs the same day target the same date (so the delivery key repeats)", () => {
    const later = new Date("2026-10-01T15:00:00Z");
    expect(practiceReminderDue(member(), later, MORNING)?.date).toBe(practiceReminderDue(member(), THURSDAY_0900_UTC, MORNING)?.date);
  });
});
