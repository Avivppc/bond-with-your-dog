import { describe, expect, it } from "vitest";
import { ownsEverything } from "./offer-ownership";

describe("ownsEverything", () => {
  const offer = [
    { course_id: "a", access_level: "full" as const },
    { course_id: "b", access_level: "limited" as const },
  ];

  it("is true only when every course is already active at (at least) the offered level", () => {
    expect(ownsEverything(offer, [{ course_id: "a", access_level: "full" }, { course_id: "b", access_level: "limited" }])).toBe(true);
    expect(ownsEverything(offer, [{ course_id: "a", access_level: "full" }, { course_id: "b", access_level: "full" }])).toBe(true);
  });

  it("lets a limited member buy the full upgrade", () => {
    expect(ownsEverything(offer, [{ course_id: "a", access_level: "limited" }, { course_id: "b", access_level: "limited" }])).toBe(false);
  });

  it("is false when a course is missing, and for offers without courses", () => {
    expect(ownsEverything(offer, [{ course_id: "a", access_level: "full" }])).toBe(false);
    expect(ownsEverything([], [])).toBe(false);
  });
});
