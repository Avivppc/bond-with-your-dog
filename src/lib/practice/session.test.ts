import { describe, expect, it } from "vitest";
import {
  arcOffset,
  buildStages,
  checklistState,
  formatClock,
  parsePracticeSteps,
  remainingSeconds,
  stepFallbackSeconds,
  summarizeSession,
  MAX_SESSION_SECONDS,
} from "./session";
import { pickPracticeLesson, sortCourses, type CatalogLesson } from "./catalog";

describe("practice steps", () => {
  it("keeps well-formed steps and drops broken ones", () => {
    const steps = parsePracticeSteps([
      { title: "Follow the hand", body: "Hand at nose height.", seconds: 90, reps: 8 },
      { title: "  " },
      { title: "Add the cue", seconds: null },
      "nonsense",
    ]);
    expect(steps).toHaveLength(2);
    expect(steps[1]).toMatchObject({ title: "Add the cue", seconds: null });
    expect(parsePracticeSteps(null)).toEqual([]);
  });

  it("wraps steps in a warm-up and cool-down, sharing the session length when a step has no time", () => {
    const stages = buildStages(parsePracticeSteps([{ title: "A", seconds: 60 }, { title: "B" }]), 10, "Luna");
    expect(stages.map((s) => s.kind)).toEqual(["warmup", "step", "step", "cooldown"]);
    expect(stages[0].label).toBe("Warm-up · 2 min");
    expect(stages[1]).toMatchObject({ label: "Step 1 · A", seconds: 60, stepNumber: 1 });
    expect(stages[2].seconds).toBe(300);
    expect(stages[3].label).toBe("Cool-down · 1 min");
    expect(stepFallbackSeconds(5, 20)).toBe(30);
  });

  it("marks checklist rows done, next or locked", () => {
    const done = new Set([0, 1]);
    expect(checklistState(0, 2, done)).toBe("done");
    expect(checklistState(2, 2, done)).toBe("next");
    expect(checklistState(3, 2, done)).toBe("lock");
  });
});

describe("timer math", () => {
  it("formats clocks", () => {
    expect(formatClock(180)).toBe("03:00");
    expect(formatClock(5.9)).toBe("00:05");
    expect(formatClock(3725)).toBe("1:02:05");
    expect(formatClock(-3)).toBe("00:00");
  });

  it("drains the arc as time runs out", () => {
    expect(arcOffset(180, 180, 553)).toBe(0);
    expect(arcOffset(90, 180, 553)).toBeCloseTo(276.5);
    expect(arcOffset(0, 180, 553)).toBe(553);
    expect(arcOffset(10, 0, 553)).toBe(553);
  });

  it("counts down from wall-clock time, never below zero", () => {
    expect(remainingSeconds(180, 1500)).toBe(179);
    expect(remainingSeconds(180, 400_000)).toBe(0);
  });

  it("summarises what gets saved", () => {
    const stages = buildStages(parsePracticeSteps([{ title: "A" }, { title: "B" }]), 10, "Luna");
    const summary = summarizeSession(stages, new Set([0, 1, 2]), [0, 4, 3, 0], 367.4);
    expect(summary).toEqual({ durationSeconds: 367, reps: 7, stepsDone: 2 });
    expect(summarizeSession(stages, new Set(), [], 10 ** 9).durationSeconds).toBe(MAX_SESSION_SECONDS);
  });
});

describe("lesson picking", () => {
  const lesson = (over: Partial<CatalogLesson>): CatalogLesson => ({
    id: "x",
    courseId: "c",
    courseTitle: "Foundations",
    number: 1,
    title: "T",
    accessible: true,
    completed: false,
    stepCount: 3,
    thumbnail: null,
    ...over,
  });

  it("opens the requested lesson only when the member can access it", () => {
    const lessons = [lesson({ id: "a", completed: true }), lesson({ id: "b" }), lesson({ id: "locked", accessible: false })];
    expect(pickPracticeLesson(lessons, "a")?.id).toBe("a");
    expect(pickPracticeLesson(lessons, "locked")?.id).toBe("b");
  });

  it("defaults to the next unfinished lesson with steps, then any open lesson with steps", () => {
    expect(pickPracticeLesson([lesson({ id: "a", stepCount: 0 }), lesson({ id: "b" })], null)?.id).toBe("b");
    expect(pickPracticeLesson([lesson({ id: "a", completed: true })], null)?.id).toBe("a");
    expect(pickPracticeLesson([lesson({ id: "a", stepCount: 0 })], null)).toBeNull();
  });

  it("orders courses by chapter number, unnumbered last", () => {
    const sorted = sortCourses([
      { title: "Zeta", chapterNumber: null },
      { title: "Moves", chapterNumber: 2 },
      { title: "Foundations", chapterNumber: 1 },
    ]);
    expect(sorted.map((c) => c.title)).toEqual(["Foundations", "Moves", "Zeta"]);
  });
});
