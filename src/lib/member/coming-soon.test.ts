import { describe, expect, it } from "vitest";
import { isComingSoon } from "./coming-soon";

describe("isComingSoon", () => {
  it("covers the sections that aren't open yet, with their sub-pages and query strings", () => {
    expect(isComingSoon("/moves")).toBe(true);
    expect(isComingSoon("/moves?move=spin-twist")).toBe(true);
    expect(isComingSoon("/community")).toBe(true);
    expect(isComingSoon("/community#live-qa")).toBe(true);
    expect(isComingSoon("/community/meetups/123")).toBe(true);
  });

  it("leaves everything else alone", () => {
    expect(isComingSoon("/my-courses")).toBe(false);
    expect(isComingSoon("/movesX")).toBe(false);
    expect(isComingSoon("/progress")).toBe(false);
    expect(isComingSoon("https://chat.whatsapp.com/abc")).toBe(false);
  });
});
