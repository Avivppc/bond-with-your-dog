import { QUIZ_QUESTIONS, TIER_ORDER, type Tier } from "./data";

export type QuizAnswers = Record<number, "A" | "B" | "C">;

export type TierScores = Record<Tier, number>;

export function scoreAnswers(answers: QuizAnswers): TierScores {
  const scores: TierScores = { foundations: 0, movement: 0, masterpiece: 0 };

  for (const question of QUIZ_QUESTIONS) {
    const chosenId = answers[question.id];
    const chosenOption = question.options.find((option) => option.id === chosenId);
    if (!chosenOption) continue;

    for (const tier of TIER_ORDER) {
      scores[tier] += chosenOption.points[tier] ?? 0;
    }
  }

  return scores;
}

/**
 * Highest score wins. On a tie, the earlier stage in TIER_ORDER is
 * recommended — this is what guarantees Masterpiece is never suggested
 * unless it wins outright over Foundations and Movement.
 */
export function resolveTier(scores: TierScores): Tier {
  return TIER_ORDER.reduce((winner, candidate) =>
    scores[candidate] > scores[winner] ? candidate : winner
  );
}
