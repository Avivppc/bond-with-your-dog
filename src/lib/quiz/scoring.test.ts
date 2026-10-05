import { describe, expect, test } from "vitest";
import { resolveTier, scoreAnswers, type QuizAnswers, type ScoredQuestion } from "./scoring";
import type { OptionId } from "./data";

// Question ids: 1 relationship, 2 goal, 3 experience, 4 excites, 5 independence, 6 worthIt
function answers(
  relationship: OptionId,
  goal: OptionId,
  experience: OptionId,
  excites: OptionId,
  independence: OptionId,
  worthIt: OptionId
): QuizAnswers {
  return { 1: relationship, 2: goal, 3: experience, 4: excites, 5: independence, 6: worthIt };
}

describe("resolveTier – readiness sets the ceiling", () => {
  test("recommends Foundations when the dog still needs food and hand guidance, whatever the ambition", () => {
    // Arrange: complete beginner who dreams of dancing
    const input = answers("C", "C", "A", "C", "C", "C");

    // Act
    const tier = resolveTier(input);

    // Assert
    expect(tier).toBe("foundations");
  });

  test("caps at Moves when the dog knows the basic tricks", () => {
    const input = answers("C", "C", "B", "C", "C", "C");

    expect(resolveTier(input)).toBe("moves");
  });

  test("caps at Moves when the dog can do sequences but still depends on a lure", () => {
    const input = answers("C", "C", "C", "C", "B", "C");

    expect(resolveTier(input)).toBe("moves");
  });

  test("'just getting started' blocks a direct Let's Dance recommendation", () => {
    const input = answers("A", "C", "C", "C", "C", "C");

    expect(resolveTier(input)).toBe("moves");
  });
});

describe("resolveTier – preference chooses within the ceiling", () => {
  test("recommends Let's Dance when the team is ready and wants music", () => {
    const input = answers("C", "C", "C", "B", "C", "B");

    expect(resolveTier(input)).toBe("letsDance");
  });

  test("recommends Moves when the team is ready but nobody mentioned music or dance", () => {
    const input = answers("B", "B", "C", "B", "C", "B");

    expect(resolveTier(input)).toBe("moves");
  });

  test("sends a lure-dependent team that mostly wants connection back to Foundations", () => {
    // Knows basic tricks (B) but still needs hand guidance (independence A)
    const input = answers("B", "A", "B", "A", "A", "B");

    expect(resolveTier(input)).toBe("foundations");
  });

  test("keeps a lure-dependent team on Moves when they want to explore tricks", () => {
    const input = answers("B", "B", "B", "B", "A", "B");

    expect(resolveTier(input)).toBe("moves");
  });

  test("falls back to Foundations when answers are missing", () => {
    expect(resolveTier({})).toBe("foundations");
  });
});

describe("scoreAnswers – vote counts for analytics", () => {
  test("counts one vote per answered question", () => {
    const input = answers("A", "B", "C", "A", "B", "C");

    expect(scoreAnswers(input)).toEqual({ foundations: 2, moves: 2, letsDance: 2 });
  });

  test("ignores unanswered questions", () => {
    expect(scoreAnswers({ 1: "A" })).toEqual({ foundations: 1, moves: 0, letsDance: 0 });
  });
});

describe("scoring an edited quiz (Admin → Lead quiz)", () => {
  // Same six questions (ids 1–6) as the original, as the admin passes them in.
  const original: ScoredQuestion[] = [
    { id: 1, key: "relationship" },
    { id: 2, key: "goal" },
    { id: 3, key: "experience" },
    { id: 4, key: "excites" },
    { id: 5, key: "independence" },
    { id: 6, key: "worthIt" },
  ];

  test("gives the same result as the original when the questions are only reworded or reordered", () => {
    const input = answers("B", "C", "C", "C", "C", "C");
    const reordered = [...original].reverse();

    expect(resolveTier(input, reordered)).toBe(resolveTier(input));
  });

  test("a removed readiness question no longer caps the result", () => {
    // Without the independence question, sequences (experience C) + wanting dance => Let's Dance.
    const withoutIndependence = original.filter((q) => q.key !== "independence");
    const input: QuizAnswers = { 1: "B", 2: "C", 3: "C", 4: "C", 6: "C" };

    expect(resolveTier(input, withoutIndependence)).toBe("letsDance");
    expect(resolveTier(input)).toBe("moves");
  });

  test("an added question counts as a preference", () => {
    // Ready for anything, but the preference questions don't ask for dance; the added one does.
    const withExtra: ScoredQuestion[] = [...original, { id: 7 }];
    const input: QuizAnswers = { ...answers("B", "B", "C", "B", "C", "B"), 7: "C" };

    expect(resolveTier(input, original)).toBe("moves");
    expect(resolveTier(input, withExtra)).toBe("letsDance");
  });

  test("vote counts include added questions", () => {
    expect(scoreAnswers({ 1: "A", 7: "C" }, [...original, { id: 7 }])).toEqual({ foundations: 1, moves: 0, letsDance: 1 });
  });
});
