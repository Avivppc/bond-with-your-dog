import { describe, expect, test } from "vitest";
import { EVENING_HOUR, practiceReminderDue, practiceTarget, type PracticeMember } from "./practice";

// 2026-10-01 is a Thursday (weekday 4).
const THURSDAY_0600_UTC = new Date("2026-10-01T06:00:00Z");

function member(overrides: Partial<PracticeMember> = {}): PracticeMember {
  return { timezone: "UTC", practiceDays: [4], practicedOn: [], hasCourses: true, wantsReminders: true, ...overrides };
}

describe("practiceTarget", () => {
  test("is today in the member's zone during the day", () => {
    expect(practiceTarget(THURSDAY_0600_UTC, "Asia/Jerusalem")).toEqual({ date: "2026-10-01", when: "today" });
  });

  test("uses the member's calendar date, not UTC's", () => {
    // 06:00 UTC is already Thursday afternoon in Auckland (UTC+13).
    expect(practiceTarget(new Date("2026-09-30T20:00:00Z"), "Pacific/Auckland")).toEqual({ date: "2026-10-01", when: "today" });
    // ...and still Wednesday afternoon in Honolulu (UTC−10).
    expect(practiceTarget(new Date("2026-10-01T02:00:00Z"), "Pacific/Honolulu")).toEqual({ date: "2026-09-30", when: "today" });
  });

  test(`from ${EVENING_HOUR}:00 local it looks at tomorrow`, () => {
    // 06:00 UTC = 23:00 the previous evening in Los Angeles (PDT).
    expect(practiceTarget(THURSDAY_0600_UTC, "America/Los_Angeles")).toEqual({ date: "2026-10-01", when: "tomorrow" });
    expect(practiceTarget(new Date("2026-10-01T17:59:00Z"), "UTC").when).toBe("today");
    expect(practiceTarget(new Date("2026-10-01T18:00:00Z"), "UTC")).toEqual({ date: "2026-10-02", when: "tomorrow" });
  });

  test("falls back to UTC for a missing or unknown zone", () => {
    expect(practiceTarget(THURSDAY_0600_UTC, null)).toEqual({ date: "2026-10-01", when: "today" });
    expect(practiceTarget(THURSDAY_0600_UTC, "Mars/Olympus_Mons")).toEqual({ date: "2026-10-01", when: "today" });
  });
});

describe("practiceReminderDue", () => {
  test("reminds a member on one of their practice days", () => {
    expect(practiceReminderDue(member(), THURSDAY_0600_UTC)).toEqual({ date: "2026-10-01", when: "today" });
  });

  test("skips days that aren't practice days", () => {
    expect(practiceReminderDue(member({ practiceDays: [1, 3, 6] }), THURSDAY_0600_UTC)).toBeNull();
  });

  test("skips members who already practiced that day", () => {
    expect(practiceReminderDue(member({ practicedOn: ["2026-10-01"] }), THURSDAY_0600_UTC)).toBeNull();
    expect(practiceReminderDue(member({ practicedOn: ["2026-09-30"] }), THURSDAY_0600_UTC)).not.toBeNull();
  });

  test("respects the switch and needs an active course", () => {
    expect(practiceReminderDue(member({ wantsReminders: false }), THURSDAY_0600_UTC)).toBeNull();
    expect(practiceReminderDue(member({ hasCourses: false }), THURSDAY_0600_UTC)).toBeNull();
  });

  test("an evening heads-up checks tomorrow's weekday", () => {
    const la = member({ timezone: "America/Los_Angeles", practiceDays: [4] });
    expect(practiceReminderDue(la, THURSDAY_0600_UTC)).toEqual({ date: "2026-10-01", when: "tomorrow" });
    expect(practiceReminderDue({ ...la, practiceDays: [3] }, THURSDAY_0600_UTC)).toBeNull();
  });

  test("a second run the same day targets the same date (so the delivery key repeats)", () => {
    const later = new Date("2026-10-01T15:00:00Z");
    expect(practiceReminderDue(member(), later)?.date).toBe(practiceReminderDue(member(), THURSDAY_0600_UTC)?.date);
  });
});
