import { describe, expect, it } from "vitest";
import type { EmailDoc } from "@/lib/email-blocks/types";
import { duplicateBlock, insertAtCursor, insertBlock, moveBlockBy, moveBlockTo, patchBlock, removeBlock, setArt, setTextField } from "./doc-ops";

const DOC: EmailDoc = {
  subject: "S",
  preheader: "P",
  blocks: [
    { id: "a", type: "divider" },
    { id: "b", type: "text", text: "hello", align: "left" },
    { id: "c", type: "spacer", size: 24 },
  ],
};

const ids = (doc: EmailDoc) => doc.blocks.map((b) => b.id).join("");

describe("doc-ops", () => {
  it("inserts at a clamped index without mutating", () => {
    const out = insertBlock(DOC, 1, { id: "x", type: "divider" });
    expect(ids(out)).toBe("axbc");
    expect(ids(insertBlock(DOC, 99, { id: "x", type: "divider" }))).toBe("abcx");
    expect(ids(DOC)).toBe("abc");
  });

  it("moves to drop gaps", () => {
    expect(ids(moveBlockTo(DOC, "a", 3))).toBe("bca");
    expect(ids(moveBlockTo(DOC, "c", 0))).toBe("cab");
    expect(ids(moveBlockTo(DOC, "a", 2))).toBe("bac");
    expect(moveBlockTo(DOC, "b", 1)).toBe(DOC);
    expect(moveBlockTo(DOC, "b", 2)).toBe(DOC);
    expect(moveBlockTo(DOC, "zz", 0)).toBe(DOC);
  });

  it("moves one step up or down and stops at the ends", () => {
    expect(ids(moveBlockBy(DOC, "b", -1))).toBe("bac");
    expect(ids(moveBlockBy(DOC, "b", 1))).toBe("acb");
    expect(moveBlockBy(DOC, "a", -1)).toBe(DOC);
    expect(moveBlockBy(DOC, "c", 1)).toBe(DOC);
  });

  it("duplicates after the original with a new id, and removes", () => {
    const dup = duplicateBlock(DOC, "b", "b2");
    expect(ids(dup)).toBe("abb2c");
    expect(dup.blocks[2]).toEqual({ id: "b2", type: "text", text: "hello", align: "left" });
    expect(ids(removeBlock(DOC, "b"))).toBe("ac");
  });

  it("patches a block but never its id or type", () => {
    const out = patchBlock(DOC, "b", { text: "bye", id: "zz", type: "divider" } as never);
    expect(out.blocks[1]).toEqual({ id: "b", type: "text", text: "bye", align: "left" });
    expect(DOC.blocks[1]).toEqual({ id: "b", type: "text", text: "hello", align: "left" });
  });

  it("sets text fields on the doc or a block, ignoring missing targets", () => {
    expect(setTextField(DOC, { scope: "doc", field: "subject" }, "New").subject).toBe("New");
    expect(setTextField(DOC, { scope: "block", id: "b", field: "text" }, "T").blocks[1]).toMatchObject({ text: "T" });
    expect(setTextField(DOC, { scope: "block", id: "gone", field: "text" }, "T")).toBe(DOC);
    expect(setTextField(DOC, { scope: "block", id: "a", field: "text" }, "T")).toBe(DOC);
  });

  it("inserts at the cursor, replacing a selection", () => {
    expect(insertAtCursor("Hi !", 3, 3, "{{first_name}}")).toEqual({ value: "Hi {{first_name}}!", caret: 17 });
    expect(insertAtCursor("Hi XX!", 5, 3, "Y")).toEqual({ value: "Hi Y!", caret: 4 });
    expect(insertAtCursor("ab", 10, 10, "c")).toEqual({ value: "abc", caret: 3 });
  });
});

describe("setArt", () => {
  it("sets the picture, and clears it back to the default, without mutating", () => {
    const withArt = setArt(DOC, "sketch");
    expect(withArt.art).toBe("sketch");
    expect(DOC.art).toBeUndefined();
    expect("art" in setArt(withArt, undefined)).toBe(false);
  });
});
