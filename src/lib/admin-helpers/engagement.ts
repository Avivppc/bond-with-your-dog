/**
 * Admin → Course → Engagement: per-lesson watching numbers in reading order, with each lesson's
 * share of the students who started the course. Pure (rows come from admin_lesson_engagement).
 */

export interface EngagementStat {
  lesson_id: string;
  video_seconds: number | null;
  viewers: number;
  completed: number;
  avg_watched_pct: number | null;
  median_stop_seconds: number | null;
}

export interface EngagementLesson {
  id: string;
  title: string;
  moduleTitle: string | null;
}

export interface EngagementRow extends EngagementLesson {
  number: number;
  videoSeconds: number | null;
  viewers: number;
  completed: number;
  /** Finished ÷ opened, 0–100; null when nobody opened it. */
  completionPct: number | null;
  avgWatchedPct: number | null;
  medianStopSeconds: number | null;
  /** Opened ÷ the course's first lesson's viewers, 0–100; null before anyone started. */
  reachPct: number | null;
}

const pct = (part: number, whole: number): number | null => (whole > 0 ? Math.round((part / whole) * 100) : null);

/** Lessons in reading order joined with their numbers (lessons without numbers show zeros). */
export function engagementRows(lessons: readonly EngagementLesson[], stats: readonly EngagementStat[]): EngagementRow[] {
  const byLesson = new Map(stats.map((s) => [s.lesson_id, s]));
  const startedCourse = Number(byLesson.get(lessons[0]?.id ?? "")?.viewers ?? 0);
  return lessons.map((lesson, index) => {
    const s = byLesson.get(lesson.id);
    const viewers = Number(s?.viewers ?? 0);
    const completed = Number(s?.completed ?? 0);
    return {
      ...lesson,
      number: index + 1,
      videoSeconds: s?.video_seconds ?? null,
      viewers,
      completed,
      completionPct: pct(completed, viewers),
      avgWatchedPct: s?.avg_watched_pct === null || s?.avg_watched_pct === undefined ? null : Number(s.avg_watched_pct),
      medianStopSeconds: s?.median_stop_seconds ?? null,
      reachPct: pct(viewers, startedCourse),
    };
  });
}

/** The lesson where the most students who reached the previous one didn't come back (min 3 to count). */
export function biggestDropOff(rows: readonly EngagementRow[]): { row: EngagementRow; lost: number } | null {
  const MIN_STUDENTS = 3;
  let best: { row: EngagementRow; lost: number } | null = null;
  for (let i = 1; i < rows.length; i++) {
    const before = rows[i - 1].viewers;
    const lost = before - rows[i].viewers;
    if (before >= MIN_STUDENTS && lost > 0 && (!best || lost > best.lost)) best = { row: rows[i], lost };
  }
  return best;
}

/** 83 → "1:23". */
export function clock(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "—";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
