import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("writes a header and quotes fields with commas, quotes and newlines", () => {
    expect(toCsv(["name", "note"], [["Dana", 'says "hi", ok'], ["Ro", "line1\nline2"]])).toBe(
      'name,note\r\nDana,"says ""hi"", ok"\r\nRo,"line1\nline2"'
    );
  });

  it("neutralises spreadsheet formulas (CSV injection)", () => {
    expect(toCsv(["v"], [["=HYPERLINK(\"x\")"], ["+1"], ["-2"], ["@cmd"]])).toBe(
      "v\r\n\"'=HYPERLINK(\"\"x\"\")\"\r\n'+1\r\n'-2\r\n'@cmd"
    );
  });

  it("renders null/undefined as empty", () => {
    expect(toCsv(["a", "b"], [[null, undefined]])).toBe("a,b\r\n,");
  });
});
