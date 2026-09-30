import { describe, expect, it } from "vitest";
import { buildOutline, moveItem, type OutlineLessonRow, type OutlineModuleRow } from "./course-outline";

const mod = (over: Partial<OutlineModuleRow> & { id: string }): OutlineModuleRow => ({
  parent_id: null,
  title: over.id,
  position: 0,
  published: true,
  ...over,
});

const lesson = (over: Partial<OutlineLessonRow> & { id: string }): OutlineLessonRow => ({
  module_id: null,
  title: over.id,
  position: 0,
  published: true,
  kind: "video",
  free_preview: false,
  available_after_days: null,
  ...over,
});

describe("buildOutline", () => {
  it("nests submodules under their parent and sorts everything by position", () => {
    const outline = buildOutline(
      [
        mod({ id: "m2", position: 2 }),
        mod({ id: "m1", position: 1 }),
        mod({ id: "s1b", parent_id: "m1", position: 2 }),
        mod({ id: "s1a", parent_id: "m1", position: 1 }),
      ],
      [
        lesson({ id: "l2", module_id: "s1a", position: 2 }),
        lesson({ id: "l1", module_id: "s1a", position: 1 }),
        lesson({ id: "l3", module_id: "m2", position: 1 }),
      ]
    );

    expect(outline.modules.map((m) => m.id)).toEqual(["m1", "m2"]);
    expect(outline.modules[0].submodules.map((s) => s.id)).toEqual(["s1a", "s1b"]);
    expect(outline.modules[0].submodules[0].lessons.map((l) => l.id)).toEqual(["l1", "l2"]);
    expect(outline.modules[1].lessons.map((l) => l.id)).toEqual(["l3"]);
    expect(outline.unassigned).toEqual([]);
  });

  it("collects lessons without a (known) module as unassigned instead of dropping them", () => {
    const outline = buildOutline(
      [mod({ id: "m1" })],
      [lesson({ id: "orphan", module_id: null }), lesson({ id: "ghost", module_id: "deleted" })]
    );
    expect(outline.unassigned.map((l) => l.id).sort()).toEqual(["ghost", "orphan"]);
  });

  it("does not mutate its inputs", () => {
    const modules = [mod({ id: "b", position: 2 }), mod({ id: "a", position: 1 })];
    const snapshot = JSON.stringify(modules);
    buildOutline(modules, []);
    expect(JSON.stringify(modules)).toBe(snapshot);
  });
});

describe("moveItem", () => {
  it("moves an item to a new index and returns a new array", () => {
    const ids = ["a", "b", "c", "d"];
    expect(moveItem(ids, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(ids, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(ids).toEqual(["a", "b", "c", "d"]);
  });

  it("returns the same order for out-of-range or no-op moves", () => {
    expect(moveItem(["a", "b"], 1, 1)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 5, 0)).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
  });
});
