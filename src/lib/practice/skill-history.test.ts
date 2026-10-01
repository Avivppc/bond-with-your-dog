import { describe, expect, it } from "vitest";
import type { SkillLevel } from "@/lib/member/viewer";
import { dateLabel, historyLine, recentMilestones, summarizeSkillHistory, type SkillEvent } from "./skill-history";

const SPIN = "spin";
const BOW = "bow";
const ev = (moveId: string, fromLevel: SkillLevel | null, toLevel: SkillLevel, createdAt: string, setBy: "member" | "coach" = "member"): SkillEvent => ({
  moveId,
  fromLevel,
  toLevel,
  setBy,
  createdAt,
});

const EVENTS = [
  ev(SPIN, "learning", "reliable", "2026-09-12T08:00:00Z"),
  ev(SPIN, null, "learning", "2026-09-03T08:00:00Z"),
  ev(BOW, null, "learning", "2026-09-20T23:30:00Z"),
  ev(SPIN, "reliable", "performance", "2026-09-30T10:00:00Z", "coach"),
];

describe("summarizeSkillHistory", () => {
  it("dates each move's current level and counts the days from Learning", () => {
    const levels = new Map<string, SkillLevel>([
      [SPIN, "reliable"],
      [BOW, "learning"],
    ]);
    const history = summarizeSkillHistory(EVENTS.slice(0, 3), levels, "UTC");
    expect(history.get(SPIN)).toEqual({ level: "reliable", since: "2026-09-12", daysFromLearning: 9 });
    expect(history.get(BOW)).toEqual({ level: "learning", since: "2026-09-20", daysFromLearning: null });
  });

  it("uses the viewer's time zone for calendar dates", () => {
    const history = summarizeSkillHistory(EVENTS, new Map([[BOW, "learning"]]), "Asia/Jerusalem");
    expect(history.get(BOW)?.since).toBe("2026-09-21");
  });

  it("dates the latest arrival at the current level after a step back", () => {
    const events = [ev(SPIN, null, "learning", "2026-09-01T08:00:00Z"), ev(SPIN, "learning", "reliable", "2026-09-05T08:00:00Z"), ev(SPIN, "reliable", "learning", "2026-09-07T08:00:00Z"), ev(SPIN, "learning", "reliable", "2026-09-10T08:00:00Z")];
    expect(summarizeSkillHistory(events, new Map([[SPIN, "reliable"]]), "UTC").get(SPIN)).toEqual({ level: "reliable", since: "2026-09-10", daysFromLearning: 4 });
  });

  it("has no line for a move without events, and no day count when Learning was skipped", () => {
    const history = summarizeSkillHistory([ev(BOW, null, "reliable", "2026-09-01T08:00:00Z")], new Map<string, SkillLevel>([[BOW, "reliable"], [SPIN, "learning"]]), "UTC");
    expect(history.get(BOW)).toEqual({ level: "reliable", since: "2026-09-01", daysFromLearning: null });
    expect(history.has(SPIN)).toBe(false);
  });
});

describe("historyLine / dateLabel", () => {
  it("reads naturally", () => {
    expect(historyLine({ level: "reliable", since: "2026-09-12", daysFromLearning: 9 }, "2026-10-01")).toBe("Reliable since September 12 · 9 days from Learning");
    expect(historyLine({ level: "performance", since: "2026-09-12", daysFromLearning: 1 }, "2026-10-01")).toBe("Performance-ready since September 12 · 1 day from Learning");
    expect(historyLine({ level: "reliable", since: "2026-09-12", daysFromLearning: 0 }, "2026-10-01")).toBe("Reliable since September 12 · same day from Learning");
    expect(historyLine({ level: "learning", since: "2025-12-30", daysFromLearning: null }, "2026-10-01")).toBe("Learning since December 30, 2025");
  });

  it("adds the year only for other years", () => {
    expect(dateLabel("2026-03-04", "2026-10-01")).toBe("March 4");
    expect(dateLabel("2025-03-04", "2026-10-01")).toBe("March 4, 2025");
  });
});

describe("recentMilestones", () => {
  it("lists step-ups to Reliable or Performance-ready, newest first", () => {
    expect(recentMilestones(EVENTS, "UTC", 5)).toEqual([
      { moveId: SPIN, level: "performance", on: "2026-09-30", byCoach: true },
      { moveId: SPIN, level: "reliable", on: "2026-09-12", byCoach: false },
    ]);
  });

  it("ignores steps back and respects the limit", () => {
    const events = [...EVENTS, ev(BOW, "performance", "reliable", "2026-10-01T08:00:00Z", "coach")];
    expect(recentMilestones(events, "UTC", 1)).toEqual([{ moveId: SPIN, level: "performance", on: "2026-09-30", byCoach: true }]);
  });
});
