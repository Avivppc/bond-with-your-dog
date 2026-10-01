import { describe, expect, it } from "vitest";
import { listFilesRecursive, type StorageEntry, type StorageList } from "./storage-walk";

const file = (name: string): StorageEntry => ({ name, id: `id-${name}` });
const folder = (name: string): StorageEntry => ({ name, id: null });

function fakeList(tree: Record<string, StorageEntry[]>, failing: string[] = []): StorageList {
  return async (prefix, { limit, offset }) =>
    failing.includes(prefix) ? { data: null, error: { message: "boom" } } : { data: (tree[prefix] ?? []).slice(offset, offset + limit), error: null };
}

describe("listFilesRecursive", () => {
  it("collects files in the folder and its sub-folders", async () => {
    const list = fakeList({
      u1: [file("avatar.jpg"), folder("stories")],
      "u1/stories": [file("a.jpg"), file("b.heic"), folder("old")],
      "u1/stories/old": [file("c.png")],
    });
    expect(await listFilesRecursive(list, "u1")).toEqual({
      paths: ["u1/avatar.jpg", "u1/stories/a.jpg", "u1/stories/b.heic", "u1/stories/old/c.png"],
      errors: [],
    });
  });

  it("pages through large folders", async () => {
    const many = Array.from({ length: 2500 }, (_, i) => file(`f${i}.jpg`));
    const result = await listFilesRecursive(fakeList({ u1: many }), "u1");
    expect(result.paths).toHaveLength(2500);
    expect(new Set(result.paths).size).toBe(2500);
  });

  it("reports folders it could not list and keeps the rest", async () => {
    const list = fakeList({ u1: [file("a.jpg"), folder("stories")] }, ["u1/stories"]);
    expect(await listFilesRecursive(list, "u1")).toEqual({ paths: ["u1/a.jpg"], errors: [{ prefix: "u1/stories", message: "boom" }] });
  });

  it("stops at a sane depth", async () => {
    const tree: Record<string, StorageEntry[]> = {};
    let prefix = "u1";
    for (let i = 0; i < 8; i++) {
      tree[prefix] = [folder("d"), file(`f${i}.jpg`)];
      prefix = `${prefix}/d`;
    }
    const result = await listFilesRecursive(fakeList(tree), "u1");
    expect(result.paths).toHaveLength(6);
    expect(result.errors).toEqual([{ prefix: "u1/d/d/d/d/d", message: "folders nested too deep" }]);
  });
});
