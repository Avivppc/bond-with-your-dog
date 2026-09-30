import { describe, expect, it } from "vitest";
import { buildOutline } from "./course-outline";
import { lessonsBehindPaywall, placePaywall } from "./paywall";

const modules = [
  { id: "m1", parent_id: null, title: "Intro", position: 1, published: true },
  { id: "m2", parent_id: null, title: "Deep", position: 2, published: true },
  { id: "m2a", parent_id: "m2", title: "Sub", position: 1, published: true },
  { id: "m3", parent_id: null, title: "Last", position: 3, published: true },
];
const lesson = (id: string, module_id: string | null, position = 1) => ({
  id,
  module_id,
  title: id,
  position,
  published: true,
  kind: "video" as const,
  free_preview: false,
  available_after_days: null,
});
const outline = buildOutline(modules, [lesson("a", "m1"), lesson("b", "m2"), lesson("c", "m2a"), lesson("d", "m3"), lesson("x", null)]);

describe("lessonsBehindPaywall", () => {
  it("is empty without a paywall", () => {
    expect(lessonsBehindPaywall(outline, null).size).toBe(0);
  });

  it("covers every lesson of later modules, their submodules and unassigned lessons", () => {
    expect([...lessonsBehindPaywall(outline, "m1")].sort()).toEqual(["b", "c", "d", "x"]);
    expect([...lessonsBehindPaywall(outline, "m2")].sort()).toEqual(["d", "x"]);
  });
});

describe("placePaywall", () => {
  it("reads the paywall position from a reordered list with a marker", () => {
    expect(placePaywall(["m1", "paywall", "m2", "m3"], "paywall")).toEqual({ moduleIds: ["m1", "m2", "m3"], paywallAfter: "m1" });
    expect(placePaywall(["m2", "m1", "m3", "paywall"], "paywall")).toEqual({ moduleIds: ["m2", "m1", "m3"], paywallAfter: "m3" });
  });

  it("rejects a paywall above every module and handles lists without a marker", () => {
    expect(placePaywall(["paywall", "m1", "m2"], "paywall")).toBeNull();
    expect(placePaywall(["m1", "m2"], "paywall")).toEqual({ moduleIds: ["m1", "m2"], paywallAfter: null });
  });
});
