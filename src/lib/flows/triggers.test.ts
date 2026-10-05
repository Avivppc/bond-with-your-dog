import { describe, expect, it } from "vitest";
import { describeTrigger, isTrigger, normalizeParams, TRIGGER_GROUPS, TRIGGERS } from "./triggers";

describe("triggers", () => {
  it("has a unique key and a known group for every trigger", () => {
    expect(new Set(TRIGGERS.map((t) => t.key)).size).toBe(TRIGGERS.length);
    for (const t of TRIGGERS) expect(TRIGGER_GROUPS).toContain(t.group);
  });

  it("recognises trigger keys", () => {
    expect(isTrigger("quiz_lead")).toBe(true);
    expect(isTrigger("chapter_80")).toBe(false);
  });

  it("fills defaults and keeps numbers in range", () => {
    expect(normalizeParams("chapter_progress", {})).toEqual({ percent: 80, courseId: null });
    expect(normalizeParams("chapter_progress", { percent: 150, courseId: "bonded-foundations" })).toEqual({ percent: 99, courseId: "bonded-foundations" });
    expect(normalizeParams("inactive_practice", { days: 0 })).toEqual({ days: 2 });
    expect(normalizeParams("signed_up", { days: 5 })).toEqual({});
  });

  it("describes a trigger in plain words", () => {
    expect(describeTrigger("chapter_progress", { percent: 80 }, "Bonded: Foundations")).toBe("Reaches 80% of Bonded: Foundations");
    expect(describeTrigger("inactive_practice", { days: 10 })).toBe("No practice for 10 days");
    expect(describeTrigger("quiz_lead", {})).toBe("Takes the quiz");
  });
});
