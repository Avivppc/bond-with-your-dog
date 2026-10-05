import { z } from "zod";
import {
  QUIZ_QUESTIONS,
  TIER_RESULTS,
  type OptionId,
  type QuizQuestion,
  type Tier,
  type TierResultContent,
} from "./data";

/**
 * The lead quiz's editable content (Admin → Assessments → Lead quiz), stored as one row in
 * public.lead_quiz_config. Answers A/B/C always point to Foundations/Moves/Let's Dance
 * (scoring.ts), so editing words never changes how results are chosen.
 */

export const OPTION_IDS = ["A", "B", "C"] as const satisfies readonly OptionId[];

/** Rule roles used by resolveTier (scoring.ts). Questions Roni adds have none. */
export const QUESTION_KEYS = [
  "relationship",
  "goal",
  "experience",
  "excites",
  "independence",
  "worthIt",
] as const satisfies readonly QuizQuestion["key"][];

export type QuestionKey = (typeof QUESTION_KEYS)[number];

export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 10;
export const MAX_LEARN_ITEMS = 10;
/** Ids are seconds since 2026 (see draft.newQuestion): room for decades. */
const MAX_QUESTION_ID = 2_147_483_647;

export const LIMITS = {
  prompt: 200,
  option: 240,
  imageUrl: 300,
  imageAlt: 200,
  personalization: 400,
  headline: 140,
  supporting: 500,
  learnItem: 80,
  firstLesson: 300,
  welcomeOffer: 300,
  ctaLabel: 40,
  ctaHref: 300,
} as const;

/** "/page" on this site (not "//host", no backslashes or spaces). */
export function isSitePath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//") && !/[\\\s]/.test(value);
}

/** A button link: a page on this site, or a full https:// address. */
export function isSafeHref(value: string): boolean {
  if (value.startsWith("/")) return isSitePath(value);
  if (!value.startsWith("https://")) return false;
  try {
    return new URL(value).hostname.length > 0 && !/\s/.test(value);
  } catch {
    return false;
  }
}

/** A link usable outside the site (email): site paths get the site's address in front. */
export function absoluteHref(href: string, baseUrl: string): string {
  return isSitePath(href) ? `${baseUrl}${href}` : href;
}

function text(max: number) {
  return z.string().trim().min(1, "can't be empty.").max(max, `is too long (up to ${max} characters).`);
}

const sitePath = z
  .string()
  .trim()
  .max(LIMITS.imageUrl)
  .refine(isSitePath, "must be a path on this site, starting with /.");

const href = z
  .string()
  .trim()
  .min(1, "can't be empty.")
  .max(LIMITS.ctaHref, `is too long (up to ${LIMITS.ctaHref} characters).`)
  .refine(isSafeHref, "must start with / (a page on this site) or https://.");

const cta = z.object({ label: text(LIMITS.ctaLabel), href });

export const QuizQuestionSchema = z.object({
  id: z.number().int().positive().max(MAX_QUESTION_ID),
  key: z.enum(QUESTION_KEYS).optional(),
  prompt: text(LIMITS.prompt),
  options: z.object({ A: text(LIMITS.option), B: text(LIMITS.option), C: text(LIMITS.option) }),
  imageUrl: sitePath.optional(),
  imageAlt: z.string().trim().max(LIMITS.imageAlt).optional(),
});

function hasUnique<T>(values: readonly T[]): boolean {
  return new Set(values).size === values.length;
}

const questionsSchema = z
  .array(QuizQuestionSchema)
  .min(MIN_QUESTIONS, `Keep at least ${MIN_QUESTIONS} questions.`)
  .max(MAX_QUESTIONS, `The quiz can have up to ${MAX_QUESTIONS} questions.`)
  .refine((qs) => hasUnique(qs.map((q) => q.id)), "Each question needs its own id. Reload the page and try again.")
  .refine(
    (qs) => hasUnique(qs.flatMap((q) => (q.key ? [q.key] : []))),
    "A scoring question appears twice. Reload the page and try again."
  );

function resultSchema<T extends Tier>(tier: T) {
  return z.object({
    tier: z.literal(tier),
    personalization: text(LIMITS.personalization),
    headline: text(LIMITS.headline),
    supporting: text(LIMITS.supporting),
    learn: z
      .array(text(LIMITS.learnItem))
      .min(1, "needs at least one item.")
      .max(MAX_LEARN_ITEMS, `can have up to ${MAX_LEARN_ITEMS} items.`),
    cta,
    secondaryCta: cta.optional(),
    firstLesson: text(LIMITS.firstLesson),
    welcomeOffer: text(LIMITS.welcomeOffer),
    imageUrl: sitePath,
    imageAlt: z.string().trim().max(LIMITS.imageAlt),
  });
}

export const QuizConfigSchema = z.object({
  questions: questionsSchema,
  results: z.object({
    foundations: resultSchema("foundations"),
    moves: resultSchema("moves"),
    letsDance: resultSchema("letsDance"),
  }),
});

export type QuizConfigQuestion = z.infer<typeof QuizQuestionSchema>;
export type QuizResults = Record<Tier, TierResultContent>;
export interface QuizConfig {
  questions: QuizConfigQuestion[];
  results: QuizResults;
}

function fromDataQuestion(question: QuizQuestion): QuizConfigQuestion {
  const options = Object.fromEntries(question.options.map((o) => [o.id, o.label])) as Record<OptionId, string>;
  return {
    id: question.id,
    key: question.key,
    prompt: question.question,
    options,
    imageUrl: question.imageUrl,
    imageAlt: question.imageAlt,
  };
}

/** The original quiz written in code (data.ts). Used whenever nothing valid is saved. */
export const DEFAULT_QUIZ_CONFIG: QuizConfig = {
  questions: QUIZ_QUESTIONS.map(fromDataQuestion),
  results: TIER_RESULTS,
};

/** The saved config when it is valid, otherwise the original quiz. */
export function parseQuizConfig(raw: unknown): QuizConfig {
  const parsed = QuizConfigSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_QUIZ_CONFIG;
}

// ── Friendly error messages for the admin editor ────────────────────────────────

export const TIER_SHORT_LABELS: Record<Tier, string> = {
  foundations: "Foundations",
  moves: "Moves",
  letsDance: "Let's Dance",
};

const RESULT_FIELD_LABELS: Record<string, string> = {
  personalization: "personal note",
  headline: "headline",
  supporting: "supporting text",
  learn: "“You'll learn” list",
  firstLesson: "first lesson",
  welcomeOffer: "welcome gift",
  imageUrl: "photo",
  imageAlt: "photo description",
};

const CTA_FIELD_LABELS: Record<string, string> = { label: "button text", href: "button link" };

function questionPlace(path: readonly PropertyKey[]): string {
  const [, index, field, option] = path;
  const question = `Question ${Number(index) + 1}`;
  if (field === "options" && typeof option === "string") return `${question}, answer ${option}`;
  if (field === "imageUrl" || field === "imageAlt") return `${question} photo`;
  return question;
}

function resultPlace(path: readonly PropertyKey[]): string {
  const [, tier, field, sub] = path;
  const result = `The ${TIER_SHORT_LABELS[tier as Tier] ?? "quiz"} result's`;
  if (field === "learn" && typeof sub === "number") return `${result} “You'll learn” line ${sub + 1}`;
  if (field === "cta" || field === "secondaryCta") return `${result} ${CTA_FIELD_LABELS[String(sub)] ?? "button"}`;
  return `${result} ${RESULT_FIELD_LABELS[String(field)] ?? "content"}`;
}

/** "Question 3, answer B can't be empty." from a schema issue. */
export function describeQuizIssue(issue: { path: readonly PropertyKey[]; message: string }): string {
  const [section] = issue.path;
  if (section === "questions" && issue.path.length >= 2) return `${questionPlace(issue.path)} ${issue.message}`;
  if (section === "results" && issue.path.length >= 3) return `${resultPlace(issue.path)} ${issue.message}`;
  return issue.message;
}

/** The first problem with a config, in plain words, or null when it is valid. */
export function quizConfigProblem(raw: unknown): string | null {
  const parsed = QuizConfigSchema.safeParse(raw);
  return parsed.success ? null : describeQuizIssue(parsed.error.issues[0]);
}
