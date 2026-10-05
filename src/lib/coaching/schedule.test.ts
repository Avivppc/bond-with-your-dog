import { describe, expect, it } from "vitest";
import { coachingSettingsSchema, openSlots, zonedTime } from "./schedule";

const SETTINGS = {
  timezone: "Asia/Jerusalem",
  weekly: [{ day: 1, start: "09:00", end: "12:00" }],
  duration_minutes: 45,
  buffer_minutes: 15,
  min_notice_hours: 24,
  max_days_ahead: 14,
};
// Thursday 1 Oct 2026, 12:00 in Jerusalem (UTC+3).
const NOW = new Date("2026-10-01T09:00:00Z");

describe("zonedTime", () => {
  it("turns Roni's wall-clock time into an instant, across daylight saving", () => {
    expect(zonedTime("2026-10-05", 9 * 60, "Asia/Jerusalem").toISOString()).toBe("2026-10-05T06:00:00.000Z");
    // Israel is back on UTC+2 from 25 Oct 2026.
    expect(zonedTime("2026-10-26", 9 * 60, "Asia/Jerusalem").toISOString()).toBe("2026-10-26T07:00:00.000Z");
    expect(zonedTime("2026-10-05", 9 * 60, "UTC").toISOString()).toBe("2026-10-05T09:00:00.000Z");
  });
});

describe("openSlots", () => {
  it("lays the grid of length + buffer inside each window on the right days", () => {
    const slots = openSlots(SETTINGS, [], [], NOW);
    expect(slots.filter((s) => s.day === "2026-10-05").map((s) => s.startsAt)).toEqual([
      "2026-10-05T06:00:00.000Z",
      "2026-10-05T07:00:00.000Z",
      "2026-10-05T08:00:00.000Z",
    ]);
    expect(new Set(slots.map((s) => s.day))).toEqual(new Set(["2026-10-05", "2026-10-12"]));
  });

  it("skips booked times, days off, and times inside the notice", () => {
    const busy = [{ starts_at: "2026-10-05T07:00:00Z", ends_at: "2026-10-05T07:45:00Z" }];
    const off = [{ starts_on: "2026-10-12", ends_on: "2026-10-12" }];
    expect(openSlots(SETTINGS, off, busy, NOW).map((s) => s.startsAt)).toEqual(["2026-10-05T06:00:00.000Z", "2026-10-05T08:00:00.000Z"]);
    // Sunday 4 Oct 08:00 UTC: Monday's 06:00 and 07:00 UTC are less than 24 hours away.
    expect(openSlots(SETTINGS, [], [], new Date("2026-10-04T08:00:00Z"))[0].startsAt).toBe("2026-10-05T08:00:00.000Z");
  });
});

describe("coachingSettingsSchema", () => {
  const valid = {
    enabled: true,
    title: "1:1 with Roni",
    description: null,
    duration_minutes: 45,
    buffer_minutes: 15,
    price_cents: 15000,
    currency: "USD",
    timezone: "Asia/Jerusalem",
    weekly: [{ day: 1, start: "09:00", end: "12:00" }],
    min_notice_hours: 24,
    max_days_ahead: 30,
    cancel_hours: 24,
    meeting_url: "https://zoom.us/j/123",
  };

  it("accepts a complete setup and refuses broken windows, zones and links", () => {
    expect(coachingSettingsSchema.safeParse(valid).success).toBe(true);
    expect(coachingSettingsSchema.safeParse({ ...valid, weekly: [{ day: 1, start: "12:00", end: "09:00" }] }).success).toBe(false);
    expect(coachingSettingsSchema.safeParse({ ...valid, timezone: "Mars/Olympus" }).success).toBe(false);
    expect(coachingSettingsSchema.safeParse({ ...valid, meeting_url: "http://zoom.us" }).success).toBe(false);
  });
});
