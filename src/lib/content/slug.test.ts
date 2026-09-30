import { describe, expect, it } from "vitest";
import { MOVE_SLUG_PATTERN, slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and dashes words", () => {
    expect(slugify("Paws Up")).toBe("paws-up");
  });

  it("drops accents and punctuation", () => {
    expect(slugify("  Café — Spin & Twist! ")).toBe("cafe-spin-twist");
  });

  it("collapses repeated separators and trims dashes", () => {
    expect(slugify("--Figure   8--")).toBe("figure-8");
  });

  it("caps the length at 60 characters without a trailing dash", () => {
    const slug = slugify(`${"a".repeat(59)} b`);
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("returns an empty string when nothing usable is left", () => {
    expect(slugify("!!!")).toBe("");
  });

  it("produces slugs the database accepts", () => {
    expect(MOVE_SLUG_PATTERN.test(slugify("Bunny hop"))).toBe(true);
    expect(MOVE_SLUG_PATTERN.test("a")).toBe(false);
    expect(MOVE_SLUG_PATTERN.test("Upper")).toBe(false);
  });
});
