import { QUIZ_QUESTIONS, TIER_ORDER, type OptionId, type QuizQuestion, type Tier } from "./data";

export type QuizAnswers = Record<number, OptionId>;

/** Per-tier vote counts. Kept for analytics (stored with each lead). */
export type TierScores = Record<Tier, number>;

const OPTION_TO_TIER: Record<OptionId, Tier> = {
  A: "foundations",
  B: "moves",
  C: "letsDance",
};

function answerFor(answers: QuizAnswers, key: QuizQuestion["key"]): OptionId | undefined {
  const question = QUIZ_QUESTIONS.find((q) => q.key === key);
  return question ? answers[question.id] : undefined;
}

function tierIndex(tier: Tier): number {
  return TIER_ORDER.indexOf(tier);
}

function lower(a: Tier, b: Tier): Tier {
  return tierIndex(a) <= tierIndex(b) ? a : b;
}

/**
 * Simple vote count: every answer votes for the tier its letter maps to.
 * This is NOT what decides the result (see resolveTier), but it is stored
 * with each lead so we can review how people answered.
 */
export function scoreAnswers(answers: QuizAnswers): TierScores {
  const scores: TierScores = { foundations: 0, moves: 0, letsDance: 0 };

  return QUIZ_QUESTIONS.reduce((acc, question) => {
    const chosen = answers[question.id];
    if (!chosen) return acc;
    const tier = OPTION_TO_TIER[chosen];
    return { ...acc, [tier]: acc[tier] + 1 };
  }, scores);
}

/**
 * Readiness sets a ceiling; preference chooses a direction within it.
 *
 * Rules (from Roni's brief, Sept 2026):
 *  - Experience A ("still needs food and hand guidance") => Foundations.
 *  - Experience B ("knows the basic tricks") => Moves at most.
 *  - Experience C ("can perform sequences") => Let's Dance is possible.
 *  - Independence caps the result the same way: A/B => Moves at most.
 *  - Relationship A ("just getting started") blocks a direct Let's Dance
 *    recommendation, but does not force Foundations on its own.
 *  - Let's Dance also requires that the person actually wants to combine
 *    movement with music (goal, excites or worth-it answered C).
 *  - Within a Moves ceiling, a team that still relies on food guidance AND
 *    is mostly looking for connection is sent to Foundations.
 */
export function resolveTier(answers: QuizAnswers): Tier {
  const experience = answerFor(answers, "experience") ?? "A";
  const independence = answerFor(answers, "independence") ?? "A";
  const relationship = answerFor(answers, "relationship") ?? "A";

  const experienceCeiling = OPTION_TO_TIER[experience];
  const independenceCeiling = independence === "C" ? "letsDance" : "moves";
  const relationshipCeiling: Tier = relationship === "A" ? "moves" : "letsDance";

  const ceiling = lower(lower(experienceCeiling, independenceCeiling), relationshipCeiling);

  if (ceiling === "foundations") return "foundations";

  const preferenceAnswers = [
    answerFor(answers, "goal"),
    answerFor(answers, "excites"),
    answerFor(answers, "worthIt"),
  ];
  const wantsDance = preferenceAnswers.some((a) => a === "C");
  const wantsConnection = preferenceAnswers.filter((a) => a === "A").length >= 2;

  if (ceiling === "letsDance") {
    return wantsDance ? "letsDance" : "moves";
  }

  // ceiling === "moves"
  if (independence === "A" && wantsConnection) return "foundations";
  return "moves";
}
