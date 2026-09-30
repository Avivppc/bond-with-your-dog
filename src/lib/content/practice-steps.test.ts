import { describe, expect, it } from "vitest";
import { parsePracticeSteps, readPracticeSteps } from "./practice-steps";

describe("parsePracticeSteps", () => {
  it("zips the columns into steps and drops blank rows", () => {
    const res = parsePracticeSteps({
      titles: ["Follow the hand", "", "Add the cue"],
      bodies: ["Nose to palm.", "", ""],
      seconds: ["60", "", ""],
      reps: ["", "", "8"],
    });
    expect(res).toEqual({
      ok: true,
      value: [
        { title: "Follow the hand", body: "Nose to palm.", seconds: 60 },
        { title: "Add the cue", body: "", reps: 8 },
      ],
    });
  });

  it("requires a title when a row has other content", () => {
    const res = parsePracticeSteps({ titles: [""], bodies: ["Do this"], seconds: [""], reps: [""] });
    expect(res).toEqual({ ok: false, error: "Practice step 1 needs a title." });
  });

  it("rejects non-integer or out-of-range seconds and reps", () => {
    expect(parsePracticeSteps({ titles: ["A"], bodies: [""], seconds: ["1.5"], reps: [""] }).ok).toBe(false);
    expect(parsePracticeSteps({ titles: ["A"], bodies: [""], seconds: ["0"], reps: [""] }).ok).toBe(false);
    expect(parsePracticeSteps({ titles: ["A"], bodies: [""], seconds: [""], reps: ["101"] }).ok).toBe(false);
  });

  it("rejects too many steps", () => {
    const titles = Array.from({ length: 13 }, (_, i) => `Step ${i}`);
    const blank = titles.map(() => "");
    const res = parsePracticeSteps({ titles, bodies: blank, seconds: blank, reps: blank });
    expect(res.ok).toBe(false);
  });

  it("tolerates ragged columns", () => {
    const res = parsePracticeSteps({ titles: ["A", "B"], bodies: [], seconds: ["30"], reps: [] });
    expect(res).toEqual({ ok: true, value: [{ title: "A", body: "", seconds: 30 }, { title: "B", body: "" }] });
  });
});

describe("readPracticeSteps", () => {
  it("reads valid rows and skips junk", () => {
    const json = [{ title: "A", body: "b", seconds: 30, reps: 5 }, { body: "no title" }, "x", { title: "C", seconds: "10" }];
    expect(readPracticeSteps(json)).toEqual([
      { title: "A", body: "b", seconds: 30, reps: 5 },
      { title: "C", body: "" },
    ]);
  });

  it("returns an empty list for non-arrays", () => {
    expect(readPracticeSteps({})).toEqual([]);
  });
});
