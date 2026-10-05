import { describe, expect, test } from "vitest";
import { DEFAULT_QUIZ_CONFIG } from "./config";
import { fromDraft, moveItem, newQuestion, removeAt, replaceAt, toDraft } from "./draft";

describe("quiz editor draft", () => {
  test("round-trips the config, editing 'You'll learn' as one item per line", () => {
    const draft = toDraft(DEFAULT_QUIZ_CONFIG);

    expect(draft.results.moves.learnText.split("\n")).toEqual(DEFAULT_QUIZ_CONFIG.results.moves.learn);
    expect(fromDraft(draft)).toEqual(DEFAULT_QUIZ_CONFIG);
  });

  test("drops blank lines and trims items", () => {
    const draft = toDraft(DEFAULT_QUIZ_CONFIG);
    const edited = { ...draft, results: { ...draft.results, moves: { ...draft.results.moves, learnText: " Spins \n\n  Weaves\n" } } };

    expect(fromDraft(edited).results.moves.learn).toEqual(["Spins", "Weaves"]);
  });

  test("new questions get an id no other question uses", () => {
    const questions = [{ ...DEFAULT_QUIZ_CONFIG.questions[0], id: 9 }, ...DEFAULT_QUIZ_CONFIG.questions.slice(1)];

    const added = newQuestion(questions, Date.UTC(2026, 0, 1));

    expect(added).toEqual({ id: 10, prompt: "", options: { A: "", B: "", C: "" } });
    expect(added.key).toBeUndefined();
  });

  test("a deleted question's id is never handed out again", () => {
    const later = Date.UTC(2026, 9, 3, 12, 0, 0);
    const added = newQuestion(DEFAULT_QUIZ_CONFIG.questions, later);
    expect(added.id).toBe((later - Date.UTC(2026, 0, 1)) / 1000);
    expect(DEFAULT_QUIZ_CONFIG.questions.some((q) => q.id === added.id)).toBe(false);
  });
});

describe("list helpers", () => {
  const list = ["a", "b", "c", "d"] as const;

  test("moveItem moves without changing the original", () => {
    expect(moveItem(list, 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(list, 3, 2)).toEqual(["a", "b", "d", "c"]);
    expect(moveItem(list, 0, -1)).toEqual(list);
    expect(moveItem(list, 3, 4)).toEqual(list);
    expect(list).toEqual(["a", "b", "c", "d"]);
  });

  test("removeAt and replaceAt return new lists", () => {
    expect(removeAt(list, 1)).toEqual(["a", "c", "d"]);
    expect(replaceAt(list, 2, "x")).toEqual(["a", "b", "x", "d"]);
  });
});
