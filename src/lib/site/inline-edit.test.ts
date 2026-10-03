import { describe, expect, test } from "vitest";
import type { FieldDef } from "./fields";
import { applyTextEdit, editableTexts, splitParagraphs, stripStars, topField } from "./inline-edit";

const fields: FieldDef[] = [
  { kind: "text", key: "heading", label: "Heading", highlight: true },
  { kind: "textarea", key: "text", label: "Text" },
  { kind: "link", key: "button", label: "Button" },
  { kind: "list", key: "cards", label: "Cards", itemLabel: "Card", max: 3, fields: [{ kind: "text", key: "title", label: "Title" }] },
  {
    kind: "blocks",
    key: "blocks",
    label: "Blocks",
    max: 5,
    blockTypes: [{ type: "heading", label: "Heading", icon: "title", fields: [{ kind: "text", key: "text", label: "Text" }], defaults: {} }],
  },
];

const values = {
  heading: "Learn the *secret* language",
  text: "First paragraph.\n\nSecond paragraph.",
  button: { label: "Go", href: "/x" },
  cards: [{ title: "One" }, { title: "Two" }],
  blocks: [{ type: "heading", text: "Block heading" }],
};

describe("editableTexts", () => {
  test("lists texts, paragraphs, list items and block texts by path", () => {
    expect(editableTexts(fields, values).map((e) => ({ path: e.path, shown: e.shown, highlight: e.highlight }))).toEqual([
      { path: "heading", shown: "Learn the secret language", highlight: true },
      { path: "text#0", shown: "First paragraph.", highlight: false },
      { path: "text#1", shown: "Second paragraph.", highlight: false },
      { path: "cards.0.title", shown: "One", highlight: false },
      { path: "cards.1.title", shown: "Two", highlight: false },
      { path: "blocks.0.text", shown: "Block heading", highlight: false },
    ]);
  });

  test("carries each field's length limit", () => {
    const limited = editableTexts([{ kind: "text", key: "t", label: "T", max: 40 }], { t: "Hi" });
    expect(limited[0].max).toBe(40);
  });

  test("leaves out texts that appear twice (they can't be told apart on the page)", () => {
    const twice = editableTexts(fields, { ...values, cards: [{ title: "Same" }, { title: "Same" }] });
    expect(twice.map((e) => e.path)).not.toContain("cards.0.title");
  });
});

describe("applyTextEdit", () => {
  test("replaces a top-level text, a list item and a block text without touching the rest", () => {
    expect(applyTextEdit(values, "heading", "New *heading*").heading).toBe("New *heading*");
    const list = applyTextEdit(values, "cards.1.title", "Deux");
    expect(list.cards).toEqual([{ title: "One" }, { title: "Deux" }]);
    expect(values.cards[1].title).toBe("Two");
    expect(applyTextEdit(values, "blocks.0.text", "Changed").blocks).toEqual([{ type: "heading", text: "Changed" }]);
  });

  test("replaces one paragraph of a multi-paragraph text", () => {
    expect(applyTextEdit(values, "text#1", " Edited. ").text).toBe("First paragraph.\n\nEdited.");
  });

  test("clearing a paragraph and typing again stays in that paragraph", () => {
    const three = { ...values, text: "A\n\nB\n\nC" };
    const snap = splitParagraphs(three.text);
    const cleared = applyTextEdit(three, "text#1", "", snap);
    const retyped = applyTextEdit(cleared, "text#1", "x", snap);
    expect(retyped.text).toBe("A\n\nx\n\nC");
  });

  test("ignores paths that don't exist", () => {
    expect(applyTextEdit(values, "cards.9.title", "x")).toEqual(values);
    expect(applyTextEdit(values, "text#5", "x")).toEqual(values);
  });
});

test("helpers", () => {
  expect(stripStars("a *b* c")).toBe("a b c");
  expect(topField("cards.1.title")).toBe("cards");
  expect(topField("text#2")).toBe("text");
});
