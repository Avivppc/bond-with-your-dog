import { describe, expect, it } from "vitest";
import { biggestDropOff, clock, engagementRows, type EngagementLesson, type EngagementStat } from "./engagement";

const LESSONS: EngagementLesson[] = [
  { id: "a", title: "Welcome", moduleTitle: "Start" },
  { id: "b", title: "Luring", moduleTitle: "Start" },
  { id: "c", title: "The 3 D's", moduleTitle: "Skills" },
];

const stat = (lesson_id: string, viewers: number, completed: number, extra: Partial<EngagementStat> = {}): EngagementStat => ({
  lesson_id,
  video_seconds: 120,
  viewers,
  completed,
  avg_watched_pct: 50,
  median_stop_seconds: 40,
  ...extra,
});

describe("engagementRows", () => {
  it("numbers lessons in reading order and measures reach against the first lesson", () => {
    const rows = engagementRows(LESSONS, [stat("a", 10, 8), stat("b", 6, 3), stat("c", 2, 2)]);
    expect(rows.map((r) => [r.number, r.reachPct, r.completionPct])).toEqual([
      [1, 100, 80],
      [2, 60, 50],
      [3, 20, 100],
    ]);
  });

  it("shows empty numbers for lessons nobody opened", () => {
    const [first] = engagementRows(LESSONS, []);
    expect(first).toMatchObject({ viewers: 0, completionPct: null, reachPct: null, avgWatchedPct: null, videoSeconds: null });
  });
});

describe("biggestDropOff", () => {
  it("finds the lesson that lost the most students", () => {
    const rows = engagementRows(LESSONS, [stat("a", 10, 8), stat("b", 9, 3), stat("c", 2, 2)]);
    expect(biggestDropOff(rows)).toMatchObject({ row: { id: "c" }, lost: 7 });
  });

  it("stays quiet with too few students", () => {
    expect(biggestDropOff(engagementRows(LESSONS, [stat("a", 2, 1), stat("b", 0, 0)]))).toBeNull();
  });
});

describe("clock", () => {
  it("formats seconds as minutes:seconds", () => {
    expect(clock(83)).toBe("1:23");
    expect(clock(5)).toBe("0:05");
    expect(clock(null)).toBe("—");
  });
});
