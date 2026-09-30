import { describe, expect, it } from "vitest";
import { excerpt, groupResults, ilikePattern, normalizeQuery, rankLessons, resultCount } from "./search";
import {
  aggregatePractice,
  filterMoves,
  gentleFirst,
  movesReady,
  nextMilestone,
  paletteOrder,
  parseMoveFilter,
  parseMoveSteps,
  progressOrder,
  filterKey,
} from "./moves";
import { achievementHint, buildAchievements, countWord, type AchievementContext } from "./achievements";
import type { SkillLevel } from "@/lib/member/viewer";

describe("search", () => {
  it("normalises queries and ignores very short ones", () => {
    expect(normalizeQuery("  spin   left ")).toBe("spin left");
    expect(normalizeQuery("s")).toBeNull();
    expect(normalizeQuery(["hop", "x"])).toBe("hop");
    expect(normalizeQuery(undefined)).toBeNull();
    expect(normalizeQuery("x".repeat(200))).toHaveLength(80);
  });

  it("escapes wildcard and filter-syntax characters", () => {
    expect(ilikePattern("50%_off")).toBe("%50\\%\\_off%");
    expect(ilikePattern("a,b(c)")).toBe("%a_b_c_%");
    expect(ilikePattern("sp*n")).toBe("%sp_n%");
  });

  it("groups in the design's order, drops empty groups and duplicates", () => {
    const hit = (id: string) => ({ id, title: id, subtitle: "", href: "/" });
    const groups = groupResults({ qa: [hit("q")], lessons: [hit("a"), hit("a"), hit("b")], moves: [] });
    expect(groups.map((g) => g.key)).toEqual(["lessons", "qa"]);
    expect(groups[0].hits).toHaveLength(2);
    expect(resultCount(groups)).toBe(3);
  });

  it("ranks open lessons with a title match first", () => {
    const ranked = rankLessons(
      [
        { title: "Body awareness", locked: false },
        { title: "Spins in both directions", locked: true },
        { title: "Your first spin", locked: false },
      ],
      "spin",
    );
    expect(ranked.map((r) => r.title)).toEqual(["Your first spin", "Body awareness", "Spins in both directions"]);
  });

  it("cuts an excerpt around the match", () => {
    const text = `${"a ".repeat(60)}pause before the spin cue${" b".repeat(60)}`;
    const out = excerpt(text, "spin", 10);
    expect(out.startsWith("…")).toBe(true);
    expect(out).toContain("spin");
  });
});

describe("moves helpers", () => {
  const move = (id: string, position: number, courseId = "found", loadsJoints = false) => ({ id, slug: id, name: id.toUpperCase(), courseId, position, loadsJoints });
  const moves = [move("a", 1), move("b", 2, "moves"), move("c", 3), move("d", 4)];
  const levels = new Map<string, SkillLevel>([["b", "reliable"], ["c", "learning"], ["d", "performance"]]);

  it("parses filters and filters by chapter or level", () => {
    expect(parseMoveFilter("course:moves")).toEqual({ kind: "course", courseId: "moves" });
    expect(parseMoveFilter("bogus")).toEqual({ kind: "all" });
    expect(filterKey(parseMoveFilter("reliable"))).toBe("reliable");
    expect(filterMoves(moves, { kind: "course", courseId: "moves" }, levels).map((m) => m.id)).toEqual(["b"]);
    expect(filterMoves(moves, { kind: "level", level: "learning" }, levels).map((m) => m.id)).toEqual(["c"]);
    expect(filterMoves(moves, { kind: "level", level: "not_started" }, levels).map((m) => m.id)).toEqual(["a"]);
  });

  it("orders the palette best-known first and the progress list most advanced first", () => {
    expect(paletteOrder(moves, levels).map((m) => m.id)).toEqual(["d", "b", "a", "c"]);
    expect(progressOrder(moves, levels).map((m) => m.id)).toEqual(["d", "b", "c", "a"]);
    expect(movesReady(levels)).toBe(2);
  });

  it("shows the gentle alternative first only for dogs with limitations on joint-heavy moves", () => {
    expect(gentleFirst(["joints"], { loadsJoints: true, gentleAlternative: "Low version" })).toBe(true);
    expect(gentleFirst([], { loadsJoints: true, gentleAlternative: "Low version" })).toBe(false);
    expect(gentleFirst(["joints"], { loadsJoints: false, gentleAlternative: "Low version" })).toBe(false);
    expect(gentleFirst(["joints"], { loadsJoints: true, gentleAlternative: null })).toBe(false);
  });

  it("picks the most practised learning move as the next milestone", () => {
    const stats = aggregatePractice([
      { move_id: "c", reps: 6 },
      { move_id: "c", reps: 5 },
      { move_id: "b", reps: 9 },
      { move_id: null, reps: 3 },
    ]);
    expect(nextMilestone(levels, stats)).toEqual({ moveId: "c", sessions: 2, averageReps: 5.5 });
    expect(nextMilestone(levels, [])).toEqual({ moveId: "c", sessions: 0, averageReps: 0 });
    expect(nextMilestone(new Map(), stats)).toBeNull();
  });

  it("reads move steps defensively", () => {
    expect(parseMoveSteps(["One", " ", 3, "Two "])).toEqual(["One", "Two"]);
    expect(parseMoveSteps({})).toEqual([]);
  });
});

describe("achievements", () => {
  const ctx: AchievementContext = {
    completedLessons: 7,
    practiceSessions: 3,
    longestRhythm: 4,
    feedbackVideos: 0,
    routines: 0,
    lessonsLeftInClosestCourse: { title: "Foundations", left: 3 },
  };

  it("gives a real hint for each rule", () => {
    expect(achievementHint("lessons_count_10", ctx)).toBe("3 lessons to go");
    expect(achievementHint("lessons_count_3", { ...ctx, completedLessons: 2 })).toBe("1 lesson to go");
    expect(achievementHint("practice_streak_6", ctx)).toBe("Best so far: 4 days in a row");
    expect(achievementHint("practice_streak_6", { ...ctx, longestRhythm: 0 })).toBe("Practise 6 days in a row");
    expect(achievementHint("course_complete", ctx)).toBe("3 lessons to go in Foundations");
    expect(achievementHint("first_feedback", { ...ctx, feedbackVideos: 1 })).toBe("Roni is reviewing your video");
  });

  it("lists earned achievements first, oldest first", () => {
    const def = (code: string) => ({ code, title: code, description: "", icon: "star", rule: code });
    const out = buildAchievements([def("a"), def("b"), def("c")], new Map([["c", "2026-09-03T00:00:00Z"], ["b", "2026-09-01T00:00:00Z"]]), ctx);
    expect(out.map((a) => a.code)).toEqual(["b", "c", "a"]);
    expect(out[2].earnedAt).toBeNull();
  });

  it("writes small counts as words", () => {
    expect(countWord(3)).toBe("three");
    expect(countWord(26)).toBe("26");
  });
});
