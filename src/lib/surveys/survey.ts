import { z } from "zod";

/**
 * Surveys: questions without a right answer (check-ins, feedback, "tell us about your dog").
 * Pure: the admin editor, the member form and the results page share these rules.
 */

export type SurveyQuestionType = "single" | "multi" | "short" | "long" | "rating";

export interface SurveyQuestion {
  id: string;
  type: SurveyQuestionType;
  prompt: string;
  required: boolean;
  /** The choices, for single / multi questions. */
  options: string[];
}

export interface SurveyDefinition {
  title: string;
  intro: string;
  thankYou: string;
  questions: SurveyQuestion[];
}

export type SurveyAnswer = string | string[] | number;
export type SurveyAnswers = Record<string, SurveyAnswer>;

export const QUESTION_TYPE_LABEL: Record<SurveyQuestionType, string> = {
  single: "One choice",
  multi: "Several choices",
  short: "Short text",
  long: "Paragraph",
  rating: "Rating 1–5",
};

export const MAX_QUESTIONS = 20;
const MAX_OPTIONS = 10;
const SHORT_MAX = 200;
const LONG_MAX = 2000;
const CHOICE_TYPES: readonly SurveyQuestionType[] = ["single", "multi"];

const questionSchema = z
  .object({
    id: z.string().regex(/^[A-Za-z0-9_-]{1,40}$/),
    type: z.enum(["single", "multi", "short", "long", "rating"]),
    prompt: z.string().trim().min(1, "Every question needs its wording.").max(300),
    required: z.boolean(),
    options: z.array(z.string().trim().min(1, "Choices can't be empty.").max(120)).max(MAX_OPTIONS),
  })
  .refine((q) => !CHOICE_TYPES.includes(q.type) || q.options.length >= 2, { message: "Choice questions need at least two choices." })
  .refine((q) => new Set(q.options).size === q.options.length, { message: "Each choice can appear once." })
  .transform((q) => (CHOICE_TYPES.includes(q.type) ? q : { ...q, options: [] }));

export const surveyDefinitionSchema = z
  .object({
    title: z.string().trim().min(1, "Give the survey a title.").max(120),
    intro: z.string().trim().max(1000),
    thankYou: z.string().trim().max(500),
    questions: z.array(questionSchema).min(1, "Add at least one question.").max(MAX_QUESTIONS),
  })
  .refine((s) => new Set(s.questions.map((q) => q.id)).size === s.questions.length, { message: "Two questions share an id." });

export function parseSurveyDefinition(input: unknown): { ok: true; survey: SurveyDefinition } | { ok: false; error: string } {
  const parsed = surveyDefinitionSchema.safeParse(input);
  return parsed.success ? { ok: true, survey: parsed.data } : { ok: false, error: parsed.error.issues[0]?.message ?? "Check the survey." };
}

/** One answer, cleaned; undefined = not answered; null = not acceptable. */
function cleanAnswer(q: SurveyQuestion, raw: unknown): SurveyAnswer | undefined | null {
  switch (q.type) {
    case "single": {
      if (raw === undefined || raw === null || raw === "") return undefined;
      return typeof raw === "string" && q.options.includes(raw) ? raw : null;
    }
    case "multi": {
      if (raw === undefined || raw === null) return undefined;
      if (!Array.isArray(raw) || !raw.every((v) => typeof v === "string" && q.options.includes(v))) return null;
      const picked = q.options.filter((o) => raw.includes(o));
      return picked.length ? picked : undefined;
    }
    case "rating": {
      if (raw === undefined || raw === null || raw === "") return undefined;
      const n = Number(raw);
      return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
    }
    case "short":
    case "long": {
      if (raw === undefined || raw === null) return undefined;
      if (typeof raw !== "string") return null;
      const text = raw.trim();
      if (!text) return undefined;
      return text.length <= (q.type === "short" ? SHORT_MAX : LONG_MAX) ? text : null;
    }
  }
}

/** Checks a member's answers against the questions; unknown keys are dropped. */
export function validateAnswers(questions: readonly SurveyQuestion[], input: unknown): { ok: true; answers: SurveyAnswers } | { ok: false; error: string } {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const entries: [string, SurveyAnswer][] = [];
  for (const q of questions) {
    const answer = cleanAnswer(q, raw[q.id]);
    if (answer === null) return { ok: false, error: `Check your answer to: ${q.prompt}` };
    if (answer === undefined) {
      if (q.required) return { ok: false, error: `Please answer: ${q.prompt}` };
      continue;
    }
    entries.push([q.id, answer]);
  }
  return { ok: true, answers: Object.fromEntries(entries) };
}

export interface QuestionSummary {
  id: string;
  prompt: string;
  type: SurveyQuestionType;
  answered: number;
  counts?: Record<string, number>;
  average?: number;
  texts?: string[];
}

const TEXTS_SHOWN = 50;

/** Results per question: choice counts, rating average and spread, or the latest text answers. */
export function summarize(questions: readonly SurveyQuestion[], responses: readonly SurveyAnswers[]): QuestionSummary[] {
  return questions.map((q) => {
    const answers = responses.map((r) => r[q.id]).filter((a): a is SurveyAnswer => a !== undefined);
    const base = { id: q.id, prompt: q.prompt, type: q.type, answered: answers.length };
    if (q.type === "single" || q.type === "multi") {
      const picks = answers.flatMap((a) => (Array.isArray(a) ? a : [String(a)]));
      return { ...base, counts: Object.fromEntries(q.options.map((o) => [o, picks.filter((p) => p === o).length])) };
    }
    if (q.type === "rating") {
      const values = answers.map(Number).filter((n) => n >= 1 && n <= 5);
      const average = values.length ? Math.round((values.reduce((s, n) => s + n, 0) / values.length) * 10) / 10 : 0;
      const counts = Object.fromEntries([1, 2, 3, 4, 5].map((n) => [String(n), values.filter((v) => v === n).length]));
      return { ...base, average, counts };
    }
    return { ...base, texts: answers.map(String).slice(-TEXTS_SHOWN).reverse() };
  });
}

/** A fresh question for the editor. */
export function newQuestion(type: SurveyQuestionType, id: string): SurveyQuestion {
  return { id, type, prompt: "", required: false, options: CHOICE_TYPES.includes(type) ? ["", ""] : [] };
}
