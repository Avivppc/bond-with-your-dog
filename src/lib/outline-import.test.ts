import { describe, expect, it } from "vitest";
import { parseOutlineImport } from "./outline-import";

describe("parseOutlineImport", () => {
  it("reads tab-separated rows pasted from Google Sheets / Excel", () => {
    const text = [
      "Module\tSubmodule\tLesson\tVimeo\tDescription",
      "The Bond\t\tWelcome\thttps://vimeo.com/111111111\tStart here",
      "The Bond\tBuilding Trust\tA Secret Language\thttps://vimeo.com/222222222/abcdef12\t",
    ].join("\n");

    const result = parseOutlineImport(text);
    expect(result.errors).toEqual([]);
    expect(result.rows).toEqual([
      { line: 2, module: "The Bond", submodule: null, lesson: "Welcome", vimeoUrl: "https://vimeo.com/111111111", description: "Start here" },
      { line: 3, module: "The Bond", submodule: "Building Trust", lesson: "A Secret Language", vimeoUrl: "https://vimeo.com/222222222/abcdef12", description: null },
    ]);
  });

  it("reads CSV with quoted fields and header aliases, in any column order", () => {
    const text = 'lesson title,video link,module\n"Sit, Stay",https://vimeo.com/333333333,"Living ""Together"""';
    const result = parseOutlineImport(text);
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toMatchObject({ module: 'Living "Together"', lesson: "Sit, Stay", vimeoUrl: "https://vimeo.com/333333333" });
  });

  it("reports row-level problems without dropping the valid rows", () => {
    const text = "Module\tLesson\tVimeo\n\tNo module\t\nM1\t\t\nM1\tBad video\thttps://youtube.com/x\nM1\tGood\t";
    const result = parseOutlineImport(text);
    expect(result.rows.map((r) => r.lesson)).toEqual(["Good"]);
    expect(result.errors).toEqual([
      { line: 2, message: "Module is required" },
      { line: 3, message: "Lesson title is required" },
      { line: 4, message: "Not a Vimeo link: https://youtube.com/x" },
    ]);
  });

  it("requires Module and Lesson columns", () => {
    expect(parseOutlineImport("Title\tVideo\nA\tB").errors[0].message).toMatch(/Module.*Lesson/);
    expect(parseOutlineImport("").errors[0].message).toMatch(/empty/i);
  });

  it("skips blank lines and caps the import size", () => {
    const rows = Array.from({ length: 501 }, (_, i) => `M\tL${i}`).join("\n");
    expect(parseOutlineImport(`Module\tLesson\n\n${rows}`).errors[0].message).toMatch(/500/);
  });
});
