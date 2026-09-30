import { describe, expect, it } from "vitest";
import { lessonState } from "./lesson-state";

const NOW = new Date("2026-10-01T12:00:00Z");
const lesson = { id: "l1", free_preview: false, available_after_days: null as number | null };

describe("lessonState", () => {
  it("is locked for students without access unless it's a free preview", () => {
    expect(lessonState(lesson, { enrolledAt: null, completed: false, now: NOW })).toEqual({ kind: "locked" });
    expect(lessonState({ ...lesson, free_preview: true }, { enrolledAt: null, completed: false, now: NOW })).toEqual({ kind: "open" });
  });

  it("keeps free previews open (and shows completion) regardless of enrollment or drip", () => {
    const preview = { ...lesson, free_preview: true, available_after_days: 30 };
    expect(lessonState(preview, { enrolledAt: null, completed: true, now: NOW })).toEqual({ kind: "completed" });
    expect(lessonState(preview, { enrolledAt: "2026-09-30T00:00:00Z", completed: false, now: NOW })).toEqual({ kind: "open" });
  });

  it("is open or completed for enrolled students", () => {
    const enrolled = { enrolledAt: "2026-09-01T00:00:00Z", now: NOW };
    expect(lessonState(lesson, { ...enrolled, completed: false })).toEqual({ kind: "open" });
    expect(lessonState(lesson, { ...enrolled, completed: true })).toEqual({ kind: "completed" });
  });

  it("opens everything for a staff preview, ignoring access and drip", () => {
    const preview = { enrolledAt: null, now: NOW, preview: true };
    expect(lessonState({ ...lesson, available_after_days: 30 }, { ...preview, completed: false })).toEqual({ kind: "open" });
    expect(lessonState(lesson, { ...preview, completed: true })).toEqual({ kind: "completed" });
  });

  it("is scheduled until its drip day, then opens", () => {
    const dripped = { ...lesson, available_after_days: 7 };
    expect(lessonState(dripped, { enrolledAt: "2026-09-28T12:00:00Z", completed: false, now: NOW })).toEqual({
      kind: "scheduled",
      unlockAt: new Date("2026-10-05T12:00:00Z"),
    });
    expect(lessonState(dripped, { enrolledAt: "2026-09-01T00:00:00Z", completed: false, now: NOW })).toEqual({ kind: "open" });
  });
});
