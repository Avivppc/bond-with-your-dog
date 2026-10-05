import { describe, expect, test } from "vitest";
import { fillReply, filterReplies, isFilledIn, savedReplySchema, toTemplate, unfilledTags, type SavedReply } from "./replies";

const reply = (over: Partial<SavedReply>): SavedReply => ({ id: "r", title: "Great start", body: "Hi {{first_name}}!", ...over });

describe("fillReply", () => {
  test("fills the tags it knows and keeps the ones without a value so staff can spot them", () => {
    const text = "Hi {{ first_name }}, {{dog_name}} did great on {{move_name}}.";
    expect(fillReply(text, { first_name: "Dana", dog_name: "", move_name: "Spin" })).toBe("Hi Dana, {{dog_name}} did great on Spin.");
  });

  test("names of built-in object keys are just unknown tags", () => {
    expect(fillReply("{{constructor}} {{toString}}", { first_name: "Dana" })).toBe("{{constructor}} {{toString}}");
  });

  test("leaves unknown tags alone", () => {
    expect(fillReply("See {{lesson_url}}", { first_name: "Dana" })).toBe("See {{lesson_url}}");
  });
});

describe("toTemplate", () => {
  test("turns this member's names back into tags, whole words only", () => {
    const vars = { first_name: "Dana", dog_name: "Max", move_name: "Spin" };
    expect(toTemplate("Hi Dana! Max nailed the Spin. Maximum points, Max.", vars)).toBe("Hi {{first_name}}! {{dog_name}} nailed the {{move_name}}. Maximum points, {{dog_name}}.");
  });

  test("a value never rewrites a tag written for another one", () => {
    expect(toTemplate("Dana did the name game", { first_name: "Dana", move_name: "name" })).toBe("{{first_name}} did the {{move_name}} game");
  });

  test("skips empty and one-letter values", () => {
    expect(toTemplate("A great try", { first_name: "A", dog_name: "" })).toBe("A great try");
  });
});

describe("unfilledTags", () => {
  test("lists each leftover tag once", () => {
    expect(unfilledTags("{{dog_name}} and {{ dog_name }} with {{move_name}}")).toEqual(["dog_name", "move_name"]);
    expect(unfilledTags("All filled in.")).toEqual([]);
    expect(isFilledIn("Hi {{ first_name }}")).toBe(false);
    expect(isFilledIn("Hi Dana {not a tag}")).toBe(true);
  });
});

describe("filterReplies", () => {
  const list = [reply({ id: "a", title: "Great start", body: "Lovely first video" }), reply({ id: "b", title: "Needs focus", body: "Try a quieter room" })];

  test("matches the title or the text, ignoring case", () => {
    expect(filterReplies(list, "QUIET").map((r) => r.id)).toEqual(["b"]);
    expect(filterReplies(list, "great").map((r) => r.id)).toEqual(["a"]);
  });

  test("an empty search keeps everything", () => {
    expect(filterReplies(list, "  ")).toHaveLength(2);
  });
});

describe("savedReplySchema", () => {
  test("trims and requires a title and a text", () => {
    expect(savedReplySchema.parse({ title: "  Hi ", body: " Hello " })).toEqual({ title: "Hi", body: "Hello" });
    expect(savedReplySchema.safeParse({ title: "", body: "Hello" }).success).toBe(false);
    expect(savedReplySchema.safeParse({ title: "Hi", body: "x".repeat(4001) }).success).toBe(false);
  });
});
