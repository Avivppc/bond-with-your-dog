import { describe, expect, it } from "vitest";
import { parseLessonContent } from "./lesson-content";

function form(entries: [string, string][]): FormData {
  const fd = new FormData();
  for (const [k, v] of entries) fd.append(k, v);
  return fd;
}

describe("parseLessonContent", () => {
  it("returns null when the content cards were not on the page", () => {
    expect(parseLessonContent(form([["title", "x"]]))).toEqual({ ok: true, value: null });
  });

  it("reads takeaways, cues and steps in order", () => {
    const res = parseLessonContent(
      form([
        ["content_fields", "1"],
        ["key_takeaways", "End on a success"],
        ["key_takeaways", ""],
        ["cues", "Look"],
        ["cues", "Break"],
        ["step_title", "Follow the hand"],
        ["step_body", ""],
        ["step_seconds", "60"],
        ["step_reps", ""],
      ])
    );
    expect(res).toEqual({
      ok: true,
      value: {
        key_takeaways: ["End on a success"],
        cues: ["Look", "Break"],
        practice_steps: [{ title: "Follow the hand", body: "", seconds: 60 }],
      },
    });
  });

  it("clears the lists when the cards were emptied", () => {
    expect(parseLessonContent(form([["content_fields", "1"]]))).toEqual({
      ok: true,
      value: { key_takeaways: [], cues: [], practice_steps: [] },
    });
  });

  it("surfaces the first validation error", () => {
    const res = parseLessonContent(form([["content_fields", "1"], ...Array.from({ length: 9 }, (_, i): [string, string] => ["cues", `c${i}`])]));
    expect(res.ok).toBe(false);
  });
});
