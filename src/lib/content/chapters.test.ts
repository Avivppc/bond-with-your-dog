import { describe, expect, it } from "vitest";
import { opensAfterError } from "./chapters";

const courses = [
  { id: "foundations", requires_course_id: null },
  { id: "moves", requires_course_id: "foundations" },
  { id: "dance", requires_course_id: "moves" },
];

describe("opensAfterError", () => {
  it("allows no prerequisite", () => {
    expect(opensAfterError("dance", null, courses)).toBeNull();
  });

  it("allows an earlier chapter", () => {
    expect(opensAfterError("dance", "foundations", courses)).toBeNull();
  });

  it("rejects the course itself", () => {
    expect(opensAfterError("moves", "moves", courses)).toMatch(/itself/);
  });

  it("rejects unknown courses", () => {
    expect(opensAfterError("moves", "nope", courses)).toMatch(/Choose/);
  });

  it("rejects loops through other chapters", () => {
    expect(opensAfterError("foundations", "dance", courses)).toMatch(/wait on each other/);
  });
});
