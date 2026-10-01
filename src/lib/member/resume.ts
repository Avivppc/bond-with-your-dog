/**
 * "Continue where you left off" for lesson videos. lesson_progress.watch_seconds keeps the furthest
 * point watched; the player starts a little before it. Pure, shared by the lesson page and player.
 */

/** Below this there's nothing worth resuming. */
const MIN_RESUME_SECONDS = 10;
/** Rewind a touch so the member hears the cue they stopped on. */
const REWIND_SECONDS = 3;
/** Closer than this to the end counts as watched: start over instead. */
const END_MARGIN_SECONDS = 15;

/** Where to resume on the server, before the video's length is known; null = from the top. */
export function resumePoint(progress: { watchSeconds: number | null; completed: boolean }): number | null {
  const watched = progress.watchSeconds ?? 0;
  if (progress.completed || watched < MIN_RESUME_SECONDS) return null;
  return Math.max(0, Math.floor(watched - REWIND_SECONDS));
}

/** The final start time once the player knows the length (0 when unknown is not trusted). */
export function resumeFrom(point: number | null, durationSeconds: number): number {
  if (point === null) return 0;
  if (durationSeconds > 0 && point > durationSeconds - END_MARGIN_SECONDS) return 0;
  return point;
}
