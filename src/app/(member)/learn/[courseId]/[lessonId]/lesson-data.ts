
export interface PracticeStep {
  title: string;
  body: string | null;
  seconds: number | null;
  reps: number | null;
}

/** lessons.practice_steps is admin-edited jsonb: keep well-formed steps only. */
export function parsePracticeSteps(raw: unknown): PracticeStep[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((s) => {
    if (!s || typeof s !== "object") return [];
    const { title, body, seconds, reps } = s as Record<string, unknown>;
    if (typeof title !== "string" || !title.trim()) return [];
    const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : null);
    return [{ title: title.trim(), body: typeof body === "string" && body.trim() ? body.trim() : null, seconds: num(seconds), reps: num(reps) }];
  });
}

export const LESSON_TABS = ["overview", "practice", "downloads", "questions"] as const;
export type LessonTab = (typeof LESSON_TABS)[number];

export function asTab(v: string | undefined): LessonTab {
  return (LESSON_TABS as readonly string[]).includes(v ?? "") ? (v as LessonTab) : "overview";
}
