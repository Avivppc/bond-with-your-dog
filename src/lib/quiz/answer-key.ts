/**
 * Turns the admin's friendly quiz form (answer rows + "correct" checkboxes) into the
 * stored format the grader and QuizPlayer use: options [{id,text}] and correct ids
 * (or [true]/[false] for true/false questions).
 */
export type QuestionKind = "single" | "multi" | "tf";

export interface AnswerKeyInput {
  kind: QuestionKind;
  /** Raw answer rows in form order (blank rows are ignored). */
  options: readonly string[];
  /** Indexes into `options` that are marked correct. */
  correct: readonly number[];
  /** For true/false questions. */
  tf: boolean | null;
}

export type AnswerKey =
  | { ok: true; options: { id: string; text: string }[]; correct: string[] | [boolean] }
  | { ok: false; error: string };

const ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz";

export function buildAnswerKey(input: AnswerKeyInput): AnswerKey {
  if (input.kind === "tf") {
    return input.tf === null ? { ok: false, error: "Choose whether the statement is true or false." } : { ok: true, options: [], correct: [input.tf] };
  }

  const filled = input.options
    .map((text, index) => ({ text: text.trim(), index }))
    .filter((o) => o.text)
    .map((o, i) => ({ ...o, id: ID_ALPHABET[i] }));
  if (filled.length < 2) return { ok: false, error: "Add at least two answers." };
  if (filled.length > ID_ALPHABET.length) return { ok: false, error: "Too many answers." };

  const correctIds = filled.filter((o) => input.correct.includes(o.index)).map((o) => o.id);
  if (correctIds.length === 0) return { ok: false, error: "Mark the correct answer (on a filled-in row)." };
  if (input.kind === "single" && correctIds.length > 1) return { ok: false, error: "Single-choice questions have exactly one correct answer." };

  return { ok: true, options: filled.map(({ id, text }) => ({ id, text })), correct: correctIds };
}
