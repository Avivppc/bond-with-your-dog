import { QUIZ_QUESTIONS, TIER_ORDER, type OptionId, type QuizQuestion, type Tier } from "./data";

export type QuizAnswers = Record<number, OptionId>;

/**
 * What scoring needs from a question. The quiz content is editable (Admin → Lead quiz), so
 * questions are passed in; `key` marks the six original questions the rules below rely on.
 */
export interface ScoredQuestion {
  id: number;
  key?: QuizQuestion["key"];
}

/** Per-tier vote counts. Kept for analytics (stored with each lead). */
export type TierScores = Record<Tier, number>;

/** A/B/C always point to these chapters. */
export const OPTION_TO_TIER: Record<OptionId, Tier> = {
  A: "foundations",
  B: "moves",
  C: "letsDance",
};

function questionFor(questions: readonly ScoredQuestion[], key: QuizQuestion["key"]): ScoredQuestion | undefined {
  return questions.find((q) => q.key === key);
}

/** The answer to a rule question (unanswered counts as A), or undefined when the quiz no longer has it. */
function ruleAnswer(answers: QuizAnswers, questions: readonly ScoredQuestion[], key: QuizQuestion["key"]): OptionId | undefined {
  const question = questionFor(questions, key);
  return question ? (answers[question.id] ?? "A") : undefined;
}

const PREFERENCE_KEYS: readonly QuizQuestion["key"][] = ["goal", "excites", "worthIt"];

/** Answers that say what the person wants: the preference questions plus any question added in the admin. */
function preferenceAnswers(answers: QuizAnswers, questions: readonly ScoredQuestion[]): (OptionId | undefined)[] {
  return questions.filter((q) => !q.key || PREFERENCE_KEYS.includes(q.key)).map((q) => answers[q.id]);
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
export function scoreAnswers(answers: QuizAnswers, questions: readonly ScoredQuestion[] = QUIZ_QUESTIONS): TierScores {
  const scores: TierScores = { foundations: 0, moves: 0, letsDance: 0 };

  return questions.reduce((acc, question) => {
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
 *
 * When staff edit the quiz: a rule question that was removed sets no ceiling, and
 * questions they add count as preference questions.
 */
export function resolveTier(answers: QuizAnswers, questions: readonly ScoredQuestion[] = QUIZ_QUESTIONS): Tier {
  const experience = ruleAnswer(answers, questions, "experience");
  const independence = ruleAnswer(answers, questions, "independence");
  const relationship = ruleAnswer(answers, questions, "relationship");

  const experienceCeiling: Tier = experience ? OPTION_TO_TIER[experience] : "letsDance";
  const independenceCeiling: Tier = independence && independence !== "C" ? "moves" : "letsDance";
  const relationshipCeiling: Tier = relationship === "A" ? "moves" : "letsDance";

  const ceiling = lower(lower(experienceCeiling, independenceCeiling), relationshipCeiling);

  if (ceiling === "foundations") return "foundations";

  const preferences = preferenceAnswers(answers, questions);
  const wantsDance = preferences.some((a) => a === "C");
  const wantsConnection = preferences.filter((a) => a === "A").length >= 2;

  if (ceiling === "letsDance") {
    return wantsDance ? "letsDance" : "moves";
  }

  // ceiling === "moves"
  if (independence === "A" && wantsConnection) return "foundations";
  return "moves";
}
