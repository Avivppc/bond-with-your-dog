import { describe, expect, it } from "vitest";
import { buildWeek, isoDate, nextPlanned, startOfWeek, weekTally } from "./week";

// Thursday, 1 October 2026 (local time).
const THU = new Date(2026, 9, 1, 10, 0);

describe("startOfWeek", () => {
  it("returns the Monday of the week", () => {
    expect(isoDate(startOfWeek(THU))).toBe("2026-09-28");
    expect(isoDate(startOfWeek(new Date(2026, 9, 4)))).toBe("2026-09-28"); // Sunday belongs to the same week
  });
});

describe("buildWeek", () => {
  const week = buildWeek({
    today: THU,
    practicedOn: ["2026-09-28", "2026-09-30", "2026-10-01"],
    planned: [{ date: "2026-10-02", minutes: 15 }],
    practiceDays: [1, 3, 6], // Mon, Wed, Sat
    sessionMinutes: 10,
  });

  it("starts on Monday and marks practiced days and today", () => {
    expect(week.map((d) => d.date)[0]).toBe("2026-09-28");
    expect(week.filter((d) => d.done).map((d) => d.date)).toEqual(["2026-09-28", "2026-09-30", "2026-10-01"]);
    expect(week.find((d) => d.today)?.date).toBe("2026-10-01");
  });

  it("plans explicit sessions and usual days that are still ahead", () => {
    expect(week.filter((d) => d.planned).map((d) => [d.date, d.minutes])).toEqual([
      ["2026-10-02", 15],
      ["2026-10-03", 10],
    ]);
  });

  it("tallies done vs. target and finds the next planned day", () => {
    expect(weekTally(week)).toEqual({ done: 3, target: 5 });
    expect(nextPlanned(week)?.date).toBe("2026-10-02");
  });
});
