import { describe, expect, it } from "vitest";
import { copyTitle, MAX_TITLE_LENGTH, moduleScope, nextCopyId, orderAfter } from "./outline-ops";

describe("copyTitle", () => {
  it("adds a copy suffix", () => {
    expect(copyTitle("Sit")).toBe("Sit (copy)");
  });

  it("keeps long titles within the limit", () => {
    const result = copyTitle("x".repeat(MAX_TITLE_LENGTH));
    expect(result).toHaveLength(MAX_TITLE_LENGTH);
    expect(result.endsWith(" (copy)")).toBe(true);
  });

  it("names an empty title", () => {
    expect(copyTitle("   ")).toBe("Lesson (copy)");
  });
});

describe("orderAfter", () => {
  it("places the new id right after the original", () => {
    expect(orderAfter(["a", "b", "c", "copy"], "a", "copy")).toEqual(["a", "copy", "b", "c"]);
  });

  it("appends when the original is missing", () => {
    expect(orderAfter(["a", "b"], "zzz", "copy")).toEqual(["a", "b", "copy"]);
  });

  it("does not change its input", () => {
    const ids = ["a", "copy", "b"];
    orderAfter(ids, "b", "copy");
    expect(ids).toEqual(["a", "copy", "b"]);
  });
});

describe("moduleScope", () => {
  const modules = [
    { id: "m1", parent_id: null },
    { id: "s1", parent_id: "m1" },
    { id: "s2", parent_id: "m1" },
    { id: "m2", parent_id: null },
  ];

  it("covers a module and its submodules", () => {
    expect(moduleScope(modules, "m1")).toEqual(["m1", "s1", "s2"]);
  });

  it("covers a single submodule", () => {
    expect(moduleScope(modules, "s2")).toEqual(["s2"]);
  });

  it("covers the whole course with a null root", () => {
    expect(moduleScope(modules, null)).toEqual(["m1", "s1", "s2", "m2"]);
  });

  it("covers nothing for an unknown module", () => {
    expect(moduleScope(modules, "nope")).toEqual([]);
  });
});

describe("nextCopyId", () => {
  it("adds -copy, then numbers further copies", () => {
    expect(nextCopyId("foundations", new Set())).toBe("foundations-copy");
    expect(nextCopyId("foundations", new Set(["foundations-copy"]))).toBe("foundations-copy-2");
    expect(nextCopyId("foundations", new Set(["foundations-copy", "foundations-copy-2"]))).toBe("foundations-copy-3");
  });

  it("keeps long ids within the 80-character limit", () => {
    expect(nextCopyId("a".repeat(80), new Set()).length).toBeLessThanOrEqual(80);
  });
});
