import { computeUnlockAt } from "./drip";

/**
 * How a lesson appears to a student in the course sidebar / outline. Display only — the database
 * (can_access_lesson) is what actually allows or refuses playback.
 */
export type LessonState =
  | { kind: "open" }
  | { kind: "completed" }
  | { kind: "locked" }
  /** The member has limited access and the lesson is behind the course paywall. */
  | { kind: "upgrade" }
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
  /** The enrollment is "limited access" (paywall applies). */
  limited?: boolean;
  /** The lesson sits below the course's paywall. */
  behindPaywall?: boolean;
}

export function lessonState(lesson: LessonForState, ctx: StudentContext): LessonState {
  const { enrolledAt, completed, now, preview = false, limited = false, behindPaywall = false } = ctx;
  // Mirrors can_access_lesson: free previews are open to everyone, with no drip delay or paywall.
  if (preview || lesson.free_preview) return completed ? { kind: "completed" } : { kind: "open" };
  if (!enrolledAt) return { kind: "locked" };
  if (limited && behindPaywall) return { kind: "upgrade" };
  const unlockAt = computeUnlockAt(enrolledAt, lesson.available_after_days);
  if (unlockAt && unlockAt.getTime() > now.getTime()) return { kind: "scheduled", unlockAt };
  return completed ? { kind: "completed" } : { kind: "open" };
}
