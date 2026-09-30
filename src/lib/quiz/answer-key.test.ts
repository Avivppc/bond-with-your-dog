import { describe, expect, it } from "vitest";
import { buildAnswerKey } from "./answer-key";

describe("buildAnswerKey", () => {
  it("builds single-choice options with ids and the correct id, skipping blank rows", () => {
    expect(buildAnswerKey({ kind: "single", options: ["Sit", "", "Down", "Paw"], correct: [2], tf: null })).toEqual({
      ok: true,
      options: [
        { id: "a", text: "Sit" },
        { id: "b", text: "Down" },
        { id: "c", text: "Paw" },
      ],
      correct: ["b"],
    });
  });

  it("builds multi-choice keys with several correct answers", () => {
    const key = buildAnswerKey({ kind: "multi", options: ["A", "B", "C"], correct: [0, 2], tf: null });
    expect(key).toMatchObject({ ok: true, correct: ["a", "c"] });
  });

  it("builds true/false keys", () => {
    expect(buildAnswerKey({ kind: "tf", options: [], correct: [], tf: false })).toEqual({ ok: true, options: [], correct: [false] });
  });

  it("explains what is missing", () => {
    expect(buildAnswerKey({ kind: "single", options: ["Only one"], correct: [0], tf: null })).toMatchObject({ ok: false, error: expect.stringMatching(/two answers/i) });
    expect(buildAnswerKey({ kind: "single", options: ["A", "B"], correct: [], tf: null })).toMatchObject({ ok: false, error: expect.stringMatching(/correct/i) });
    expect(buildAnswerKey({ kind: "single", options: ["A", "B"], correct: [0, 1], tf: null })).toMatchObject({ ok: false, error: expect.stringMatching(/one correct/i) });
    expect(buildAnswerKey({ kind: "multi", options: ["A", "", "C"], correct: [1], tf: null })).toMatchObject({ ok: false, error: expect.stringMatching(/correct/i) });
    expect(buildAnswerKey({ kind: "tf", options: [], correct: [], tf: null })).toMatchObject({ ok: false, error: expect.stringMatching(/true or false/i) });
  });
});
