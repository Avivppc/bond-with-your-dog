import { describe, expect, it } from "vitest";
import { asTab, parsePracticeSteps } from "./lesson-data";

describe("parsePracticeSteps", () => {
  it("keeps titled steps and cleans numbers", () => {
    expect(parsePracticeSteps([{ title: " Lure a circle ", body: "Slowly.", seconds: 180.4, reps: 8 }])).toEqual([{ title: "Lure a circle", body: "Slowly.", seconds: 180, reps: 8 }]);
  });
  it("drops untitled steps and nonsense values", () => {
    expect(parsePracticeSteps([{ body: "no title" }, { title: "x", seconds: -3, reps: "8" }, "junk"])).toEqual([{ title: "x", body: null, seconds: null, reps: null }]);
    expect(parsePracticeSteps(null)).toEqual([]);
  });
});

describe("asTab", () => {
  it("defaults to overview for unknown tabs", () => {
    expect(asTab("questions")).toBe("questions");
    expect(asTab("nope")).toBe("overview");
    expect(asTab(undefined)).toBe("overview");
  });
});
