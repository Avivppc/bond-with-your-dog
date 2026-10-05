import type { Tier, TierResultContent } from "./data";
import type { QuizConfig, QuizConfigQuestion, QuizResults } from "./config";

/**
 * The admin editor's working copy of the quiz. Same as the config, except each result's
 * "You'll learn" list is edited as text, one item per line.
 */
export interface ResultDraft extends Omit<TierResultContent, "learn"> {
  learnText: string;
}

export interface QuizDraft {
  questions: QuizConfigQuestion[];
  results: Record<Tier, ResultDraft>;
}

function resultToDraft({ learn, ...rest }: TierResultContent): ResultDraft {
  return { ...rest, learnText: learn.join("\n") };
}

function resultFromDraft({ learnText, ...rest }: ResultDraft): TierResultContent {
  const learn = learnText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return { ...rest, learn };
}

export function toDraft(config: QuizConfig): QuizDraft {
  return {
    questions: config.questions,
    results: {
      foundations: resultToDraft(config.results.foundations),
      moves: resultToDraft(config.results.moves),
      letsDance: resultToDraft(config.results.letsDance),
    },
  };
}

/** The config to validate and save (not yet validated). */
export function fromDraft(draft: QuizDraft): QuizConfig {
  const results: QuizResults = {
    foundations: resultFromDraft(draft.results.foundations),
    moves: resultFromDraft(draft.results.moves),
    letsDance: resultFromDraft(draft.results.letsDance),
  };
  return { questions: draft.questions, results };
}

const ID_EPOCH_MS = Date.UTC(2026, 0, 1);

/**
 * A blank question with an id no question has ever used: leads' answers are stored by id, so a
 * deleted question's id must not come back. Seconds since 2026 keep growing; the highest current
 * id + 1 covers clocks that are behind.
 */
export function newQuestion(questions: readonly QuizConfigQuestion[], now: number = Date.now()): QuizConfigQuestion {
  const highest = questions.reduce((max, q) => Math.max(max, q.id), 0);
  const id = Math.max(highest + 1, Math.floor((now - ID_EPOCH_MS) / 1000));
  return { id, prompt: "", options: { A: "", B: "", C: "" } };
}

export function replaceAt<T>(list: readonly T[], index: number, item: T): T[] {
  return list.map((current, i) => (i === index ? item : current));
}

export function removeAt<T>(list: readonly T[], index: number): T[] {
  return list.filter((_, i) => i !== index);
}

/** Moves one item to another position; out-of-range moves leave the list as it was. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return [...list];
  const without = removeAt(list, from);
  return [...without.slice(0, to), list[from], ...without.slice(to)];
}
