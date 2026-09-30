import { computeUnlockAt } from "./drip";

/**
 * How a lesson appears to a student in the course sidebar / outline. Display only — the database
 * (can_access_lesson) is what actually allows or refuses playback.
 */
export type LessonState =
  | { kind: "open" }
  | { kind: "completed" }
  | { kind: "locked" }
  | { kind: "scheduled"; unlockAt: Date };

interface LessonForState {
  free_preview: boolean;
  available_after_days: number | null;
}

interface StudentContext {
  /** Enrollment start of an ACTIVE enrollment, or null when the student has no access. */
  enrolledAt: string | null;
  completed: boolean;
  now: Date;
  /** Staff previewing a course they aren't enrolled in (the DB lets staff open every lesson). */
  preview?: boolean;
}

export function lessonState(lesson: LessonForState, { enrolledAt, completed, now, preview = false }: StudentContext): LessonState {
  // Mirrors can_access_lesson: free previews are open to everyone, with no drip delay.
  if (preview || lesson.free_preview) return completed ? { kind: "completed" } : { kind: "open" };
  if (!enrolledAt) return { kind: "locked" };
  const unlockAt = computeUnlockAt(enrolledAt, lesson.available_after_days);
  if (unlockAt && unlockAt.getTime() > now.getTime()) return { kind: "scheduled", unlockAt };
  return completed ? { kind: "completed" } : { kind: "open" };
}
