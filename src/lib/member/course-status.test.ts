import { describe, expect, it } from "vitest";
import { courseStatus } from "./course-status";

describe("courseStatus", () => {
  it("is not owned without an enrollment, whatever else is true", () => {
    expect(courseStatus({ enrolled: false, completed: 3, total: 3, lockedBehind: true })).toBe("not_owned");
  });
  it("locks an owned chapter until the previous one is finished", () => {
    expect(courseStatus({ enrolled: true, completed: 0, total: 7, lockedBehind: true })).toBe("locked");
  });
  it("tracks progress on an open chapter", () => {
    expect(courseStatus({ enrolled: true, completed: 0, total: 7, lockedBehind: false })).toBe("not_started");
    expect(courseStatus({ enrolled: true, completed: 2, total: 7, lockedBehind: false })).toBe("in_progress");
    expect(courseStatus({ enrolled: true, completed: 7, total: 7, lockedBehind: false })).toBe("completed");
  });
  it("does not call an empty course completed", () => {
    expect(courseStatus({ enrolled: true, completed: 0, total: 0, lockedBehind: false })).toBe("not_started");
  });
});
