import type { ParseResult } from "./lists";

/** One row of `lessons.practice_steps` (what Practice mode walks the member through). */
export interface PracticeStep {
  title: string;
  body: string;
  seconds?: number;
  reps?: number;
}

/** The editor submits each field once per row: step_title, step_body, step_seconds, step_reps. */
export interface PracticeStepColumns {
  titles: readonly unknown[];
  bodies: readonly unknown[];
  seconds: readonly unknown[];
  reps: readonly unknown[];
}

export const MAX_PRACTICE_STEPS = 12;
export const MAX_STEP_TITLE = 120;
export const MAX_STEP_BODY = 1000;
export const MAX_STEP_SECONDS = 3600;
export const MAX_STEP_REPS = 100;

const text = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

type OptionalInt = { ok: true; value: number | undefined } | { ok: false };

function optionalInt(raw: string, max: number): OptionalInt {
  if (raw === "") return { ok: true, value: undefined };
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= max ? { ok: true, value: n } : { ok: false };
}

function parseRow(cols: PracticeStepColumns, i: number): ParseResult<PracticeStep | null> {
  const [title, body, secondsRaw, repsRaw] = [cols.titles[i], cols.bodies[i], cols.seconds[i], cols.reps[i]].map(text);
  const label = `Practice step ${i + 1}`;
  if (!title && !body && !secondsRaw && !repsRaw) return { ok: true, value: null };
  if (!title) return { ok: false, error: `${label} needs a title.` };
  if (title.length > MAX_STEP_TITLE) return { ok: false, error: `${label}: keep the title under ${MAX_STEP_TITLE} characters.` };
  if (body.length > MAX_STEP_BODY) return { ok: false, error: `${label}: keep the instructions under ${MAX_STEP_BODY} characters.` };
  const seconds = optionalInt(secondsRaw, MAX_STEP_SECONDS);
  if (!seconds.ok) return { ok: false, error: `${label}: seconds must be a whole number from 1 to ${MAX_STEP_SECONDS}.` };
  const reps = optionalInt(repsRaw, MAX_STEP_REPS);
  if (!reps.ok) return { ok: false, error: `${label}: reps must be a whole number from 1 to ${MAX_STEP_REPS}.` };
  return {
    ok: true,
    value: {
      title,
      body,
      ...(seconds.value !== undefined ? { seconds: seconds.value } : {}),
      ...(reps.value !== undefined ? { reps: reps.value } : {}),
    },
  };
}

/** Validates the editor's rows (blank rows are dropped) into the jsonb shape the member app reads. */
export function parsePracticeSteps(cols: PracticeStepColumns): ParseResult<PracticeStep[]> {
  const rowCount = Math.max(cols.titles.length, cols.bodies.length, cols.seconds.length, cols.reps.length);
  const steps: PracticeStep[] = [];
  for (let i = 0; i < rowCount; i++) {
    const row = parseRow(cols, i);
    if (!row.ok) return row;
    if (row.value) steps.push(row.value);
  }
  if (steps.length > MAX_PRACTICE_STEPS) return { ok: false, error: `Up to ${MAX_PRACTICE_STEPS} practice steps.` };
  return { ok: true, value: steps };
}

const positiveInt = (v: unknown): number | undefined => (typeof v === "number" && Number.isInteger(v) && v > 0 ? v : undefined);

/** Reads `lessons.practice_steps` from the database, skipping malformed rows. */
export function readPracticeSteps(value: unknown): PracticeStep[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((row): PracticeStep[] => {
    if (typeof row !== "object" || row === null) return [];
    const r = row as Record<string, unknown>;
    if (typeof r.title !== "string" || !r.title.trim()) return [];
    const seconds = positiveInt(r.seconds);
    const reps = positiveInt(r.reps);
    return [
      {
        title: r.title,
        body: typeof r.body === "string" ? r.body : "",
        ...(seconds !== undefined ? { seconds } : {}),
        ...(reps !== undefined ? { reps } : {}),
      },
    ];
  });
}
