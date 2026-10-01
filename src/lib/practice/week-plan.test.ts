import { describe, expect, it } from "vitest";
import { buildWeek, weekTotals, DEFAULT_SESSION_TITLE } from "./week-plan";
import { buildMonthCalendar, busiestDayPart, heatLevel, monthStats } from "./month";

const MONDAY = "2026-09-28";
const TODAY = "2026-10-01"; // Thursday

describe("buildWeek", () => {
  it("merges done sessions, explicit plans and the default rhythm", () => {
    const week = buildWeek({
      monday: MONDAY,
      today: TODAY,
      sessions: [
        { id: "s1", practicedOn: "2026-09-28", title: "Eye Contact", durationSeconds: 480 },
        { id: "s2", practicedOn: "2026-10-01", title: "Spin", durationSeconds: 350 },
      ],
      planned: [{ id: "p1", plannedOn: "2026-10-03", title: "Reading Focus", minutes: 10, lessonId: "l1" }],
      practiceDays: [1, 3, 6], // Mon, Wed, Sat
      sessionMinutes: 10,
    });

    expect(week.map((d) => d.date)).toEqual(["2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    // Monday: practiced, so the default isn't added on top.
    expect(week[0].items).toEqual([{ kind: "done", id: "s1", title: "Eye Contact", minutes: 8 }]);
    // Tuesday: not a practice day → rest.
    expect(week[1].isRest).toBe(true);
    // Wednesday: a practice day in the past with nothing logged.
    expect(week[2].items).toEqual([{ kind: "default", title: DEFAULT_SESSION_TITLE, minutes: 10, past: true }]);
    // Thursday: today, practiced even though it isn't a practice day.
    expect(week[3].isToday).toBe(true);
    expect(week[3].items[0]).toMatchObject({ kind: "done", minutes: 6 });
    // Saturday: the explicit plan replaces the default.
    expect(week[5].items).toEqual([{ kind: "planned", id: "p1", title: "Reading Focus", minutes: 10, lessonId: "l1", past: false }]);
    expect(week[6].isRest).toBe(true);
  });

  it("totals done minutes and upcoming sessions", () => {
    const week = buildWeek({
      monday: MONDAY,
      today: TODAY,
      sessions: [{ id: "s1", practicedOn: "2026-09-28", title: "A", durationSeconds: 600 }],
      planned: [],
      practiceDays: [1, 5],
      sessionMinutes: 5,
    });
    expect(weekTotals(week)).toEqual({ doneMinutes: 10, doneSessions: 1, upcoming: 1 });
  });
});

describe("month calendar", () => {
  const ref = { year: 2026, month: 9 };
  const sessions = [
    { practicedOn: "2026-09-01", durationSeconds: 300, createdAt: "2026-09-01T07:00:00Z" },
    { practicedOn: "2026-09-02", durationSeconds: 900, createdAt: "2026-09-02T08:00:00Z" },
    { practicedOn: "2026-09-03", durationSeconds: 1500, createdAt: "2026-09-03T09:00:00Z" },
    { practicedOn: "2026-09-10", durationSeconds: 600, createdAt: "2026-09-10T19:00:00Z" },
    { practicedOn: "2026-10-01", durationSeconds: 600, createdAt: "2026-10-01T19:00:00Z" },
  ];

  it("starts on Monday and maps minutes to heat levels", () => {
    const cal = buildMonthCalendar(ref, sessions);
    expect(cal.leadingBlanks).toBe(1); // September 1, 2026 is a Tuesday
    expect(cal.cells).toHaveLength(30);
    expect(cal.cells.slice(0, 4).map((c) => c.level)).toEqual([1, 2, 3, 0]);
    expect(heatLevel(0, 0)).toBe(0);
    expect(heatLevel(0, 1)).toBe(1);
  });

  it("computes this month's stats from sessions in the month only", () => {
    expect(monthStats(ref, sessions)).toEqual({ sessions: 4, minutes: 55, longestRhythm: 3, averageMinutes: 14 });
    expect(monthStats({ year: 2026, month: 8 }, sessions)).toEqual({ sessions: 0, minutes: 0, longestRhythm: 0, averageMinutes: 0 });
  });

  it("names the busiest part of the day only with enough data and a clear leader", () => {
    const ats = sessions.map((s) => s.createdAt);
    expect(busiestDayPart(ats, "UTC")).toEqual({ part: "morning", count: 3, total: 5 });
    expect(busiestDayPart(ats.slice(0, 2), "UTC")).toBeNull();
    expect(busiestDayPart(["2026-09-01T07:00:00Z", "2026-09-01T19:00:00Z", "2026-09-01T13:00:00Z"], "UTC")).toBeNull();
  });
});
