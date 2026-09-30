import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps same-site paths (with query strings)", () => {
    expect(safeNext("/checkout/foundations")).toBe("/checkout/foundations");
    expect(safeNext("/learn/a?x=1")).toBe("/learn/a?x=1");
  });

  it("falls back to the member home for anything that could leave the site", () => {
    for (const bad of [null, undefined, "", "https://evil.com", "//evil.com", "/\\evil.com", "\\\\evil.com", "javascript:alert(1)", "evil.com"]) {
      expect(safeNext(bad)).toBe("/home");
    }
  });
});
