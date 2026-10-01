import { describe, expect, test } from "vitest";
import { canEmail, parseMemberRow, wantsSessionReminder, type ReminderMember } from "./members";

const ROW = {
  user_id: "00000000-0000-4000-8000-000000000001",
  email: "dana@example.com",
  first_name: "Dana",
  timezone: "Asia/Jerusalem",
  practice_days: [1, 3, 6],
  session_minutes: 15,
  notif_prefs: { live_qa: true, reminder_emails: true },
  has_courses: true,
  in_community: true,
  practiced_on: ["2026-10-01"],
};

function member(overrides: Partial<ReminderMember> = {}): ReminderMember {
  const parsed = parseMemberRow(ROW);
  if (!parsed) throw new Error("fixture should parse");
  return { ...parsed, ...overrides };
}

describe("parseMemberRow", () => {
  test("maps an RPC row and reads prefs with their defaults", () => {
    const m = parseMemberRow(ROW);
    expect(m).toMatchObject({ userId: ROW.user_id, firstName: "Dana", sessionMinutes: 15, practiceDays: [1, 3, 6], practicedOn: ["2026-10-01"] });
    expect(m?.prefs).toEqual({ practice_reminders: true, feedback: true, new_lesson: true, live_qa: true, reminder_emails: true });
  });

  test("fills nullable columns with safe defaults", () => {
    const m = parseMemberRow({ ...ROW, practice_days: null, session_minutes: null, practiced_on: null, notif_prefs: null });
    expect(m).toMatchObject({ practiceDays: [], sessionMinutes: 10, practicedOn: [] });
    expect(m?.prefs.reminder_emails).toBe(false);
  });

  test("rejects malformed rows", () => {
    expect(parseMemberRow({ ...ROW, user_id: "nope" })).toBeNull();
    expect(parseMemberRow(null)).toBeNull();
  });
});

describe("wantsSessionReminder", () => {
  test("Live Q&A goes to every community member with the switch on", () => {
    expect(wantsSessionReminder(member(), "live_qa", false)).toBe(true);
  });

  test("meetups only go to members who said they're coming", () => {
    expect(wantsSessionReminder(member(), "meetup", false)).toBe(false);
    expect(wantsSessionReminder(member(), "meetup", true)).toBe(true);
  });

  test("needs the switch and community access", () => {
    const off = member({ prefs: { ...member().prefs, live_qa: false } });
    expect(wantsSessionReminder(off, "live_qa", true)).toBe(false);
    expect(wantsSessionReminder(member({ inCommunity: false }), "live_qa", true)).toBe(false);
  });
});

describe("canEmail", () => {
  test("needs Resend, the email switch and an address", () => {
    expect(canEmail(member(), true)).toBe(true);
    expect(canEmail(member(), false)).toBe(false);
    expect(canEmail(member({ email: null }), true)).toBe(false);
    expect(canEmail(member({ prefs: { ...member().prefs, reminder_emails: false } }), true)).toBe(false);
  });
});
