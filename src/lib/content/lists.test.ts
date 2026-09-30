import { describe, expect, it } from "vitest";
import { parseTextList, readTextList } from "./lists";

const OPTS = { label: "Key takeaways", maxItems: 3, maxLength: 20 };

describe("parseTextList", () => {
  it("trims items and drops blank rows", () => {
    expect(parseTextList([" Soft eyes ", "", "  ", "Pause"], OPTS)).toEqual({ ok: true, value: ["Soft eyes", "Pause"] });
  });

  it("ignores non-string entries (e.g. files)", () => {
    expect(parseTextList([42, "Look"], OPTS)).toEqual({ ok: true, value: ["Look"] });
  });

  it("rejects too many items", () => {
    const res = parseTextList(["a", "b", "c", "d"], OPTS);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("up to 3");
  });

  it("rejects items that are too long", () => {
    const res = parseTextList(["x".repeat(21)], OPTS);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain("20 characters");
  });
});

describe("readTextList", () => {
  it("keeps only non-empty strings", () => {
    expect(readTextList(["a", 2, "", null, "b"])).toEqual(["a", "b"]);
  });

  it("returns an empty list for non-arrays", () => {
    expect(readTextList(null)).toEqual([]);
    expect(readTextList("a")).toEqual([]);
  });
});
