import { describe, expect, test } from "vitest";
import { isNotifPrefKey, readNotifPrefs, withNotifPref } from "./prefs";

describe("readNotifPrefs", () => {
  test("uses the design's defaults when nothing is stored", () => {
    expect(readNotifPrefs({})).toEqual({ practice_reminders: true, feedback: true, new_lesson: true, live_qa: false, reminder_emails: false });
    expect(readNotifPrefs(null)).toEqual({ practice_reminders: true, feedback: true, new_lesson: true, live_qa: false, reminder_emails: false });
  });

  test("reads stored values and older key names", () => {
    expect(readNotifPrefs({ feedback: false, live_sessions: true, new_courses: false })).toEqual({
      practice_reminders: true,
      feedback: false,
      new_lesson: false,
      live_qa: true,
      reminder_emails: false,
    });
    expect(readNotifPrefs({ live_qa: false, live_sessions: true }).live_qa).toBe(false);
  });

  test("ignores values that are not booleans", () => {
    expect(readNotifPrefs({ feedback: "no" }).feedback).toBe(true);
  });
});

describe("withNotifPref", () => {
  test("returns a new object and keeps other keys", () => {
    const stored = { community: false, feedback: true };
    const next = withNotifPref(stored, "feedback", false);
    expect(next).toEqual({ community: false, feedback: false });
    expect(stored.feedback).toBe(true);
  });
});

test("isNotifPrefKey accepts only known switches", () => {
  expect(isNotifPrefKey("live_qa")).toBe(true);
  expect(isNotifPrefKey("admin")).toBe(false);
});
