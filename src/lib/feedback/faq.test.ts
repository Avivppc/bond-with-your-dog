import { expect, test } from "vitest";
import { FAQ, filterFaq } from "./faq";

test("an empty query shows every question", () => {
  expect(filterFaq(FAQ, "  ")).toHaveLength(FAQ.length);
});

test("matches every word, case-insensitively, in questions and answers", () => {
  expect(filterFaq(FAQ, "PUPPY").map((f) => f.id)).toEqual(["puppy"]);
  expect(filterFaq(FAQ, "film daylight").map((f) => f.id)).toEqual(["filming"]);
  expect(filterFaq(FAQ, "paddle").map((f) => f.id)).toContain("purchases");
});

test("no match returns an empty list", () => {
  expect(filterFaq(FAQ, "pirouette")).toEqual([]);
});

test("answers never send people to Kajabi", () => {
  expect(FAQ.some((f) => /kajabi/i.test(f.answer))).toBe(false);
});
