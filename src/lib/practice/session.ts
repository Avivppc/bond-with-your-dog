import { z } from "zod";

/**
 * Practice mode: the stages of one session (warm-up, the lesson's practice steps, cool-down),
 * timer math and the numbers saved when the session ends. Pure — shared by server and client.
 */
export const PracticeStepSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(2000).nullish(),
  seconds: z.number().int().min(5).max(3600).nullish(),
  reps: z.number().int().min(1).max(200).nullish(),
});
export type PracticeStep = z.infer<typeof PracticeStepSchema>;

/** Lesson.practice_steps is editor-supplied JSON: keep only well-formed steps. */
export function parsePracticeSteps(raw: unknown): PracticeStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const parsed = PracticeStepSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export const WARM_UP_SECONDS = 120;
export const COOL_DOWN_SECONDS = 60;
export const MAX_SESSION_SECONDS = 4 * 60 * 60;

export type StageKind = "warmup" | "step" | "cooldown";

export interface Stage {
  kind: StageKind;
  /** Checklist label, e.g. "Warm-up · 2 min" or "Step 1 · Follow the hand". */
  label: string;
  title: string;
  body: string;
  seconds: number;
  reps: number | null;
  /** 1-based step number for kind "step". */
  stepNumber: number | null;
}

function minutesLabel(seconds: number): string {
  return `${Math.max(1, Math.round(seconds / 60))} min`;
}

/**
 * A step without its own length gets an even share of the session (the lesson's practice
 * minutes, else the member's preferred session length), never less than 30 seconds.
 */
export function stepFallbackSeconds(sessionMinutes: number, stepCount: number): number {
  const total = Math.max(1, sessionMinutes) * 60;
  return Math.max(30, Math.round(total / Math.max(1, stepCount) / 5) * 5);
}

export function buildStages(steps: readonly PracticeStep[], sessionMinutes: number, dogName: string): Stage[] {
  const fallback = stepFallbackSeconds(sessionMinutes, steps.length);
  const warmup: Stage = {
    kind: "warmup",
    label: `Warm-up · ${minutesLabel(WARM_UP_SECONDS)}`,
    title: `Warm up with ${dogName}`,
    body: "A few easy things you both know well and a little play, so you start the session together.",
    seconds: WARM_UP_SECONDS,
    reps: null,
    stepNumber: null,
  };
  const cooldown: Stage = {
    kind: "cooldown",
    label: `Cool-down · ${minutesLabel(COOL_DOWN_SECONDS)}`,
    title: "Cool down",
    body: `Slow down together and end on something calm ${dogName} enjoys.`,
    seconds: COOL_DOWN_SECONDS,
    reps: null,
    stepNumber: null,
  };
  const middle = steps.map<Stage>((s, i) => ({
    kind: "step",
    label: `Step ${i + 1} · ${s.title}`,
    title: s.title,
    body: s.body ?? "",
    seconds: s.seconds ?? fallback,
    reps: s.reps ?? null,
    stepNumber: i + 1,
  }));
  return [warmup, ...middle, cooldown];
}

export type CheckState = "done" | "next" | "lock";

export function checklistState(index: number, current: number, completed: ReadonlySet<number>): CheckState {
  if (completed.has(index)) return "done";
  return index === current ? "next" : "lock";
}

/** "03:00" */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}

/** Stroke offset for the timer arc: full when time is left, empty when it runs out. */
export function arcOffset(left: number, total: number, circumference: number): number {
  if (total <= 0) return circumference;
  const ratio = Math.min(1, Math.max(0, left / total));
  return circumference * (1 - ratio);
}

/** Seconds left on a countdown that has run for `elapsedMs` since `startedLeft` seconds were left. */
export function remainingSeconds(startedLeft: number, elapsedMs: number): number {
  return Math.max(0, Math.ceil(startedLeft - elapsedMs / 1000));
}

export interface SessionSummary {
  durationSeconds: number;
  reps: number;
  stepsDone: number;
}

/** What gets saved: wall time (capped), all reps counted, and how many real steps were finished. */
export function summarizeSession(stages: readonly Stage[], completed: ReadonlySet<number>, repsByStage: readonly number[], elapsedSeconds: number): SessionSummary {
  const stepsDone = stages.filter((s, i) => s.kind === "step" && completed.has(i)).length;
  const reps = repsByStage.reduce((sum, r) => sum + Math.max(0, r), 0);
  return {
    durationSeconds: Math.min(MAX_SESSION_SECONDS, Math.max(0, Math.round(elapsedSeconds))),
    reps: Math.min(1000, reps),
    stepsDone: Math.min(50, stepsDone),
  };
}
