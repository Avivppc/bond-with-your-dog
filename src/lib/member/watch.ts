/**
 * How a member watches a lesson video: when watching counts as finishing it, and what to say when
 * the video can't be played. Pure, shared by the lesson player and its tests.
 */

/** Watching this much of a lesson counts as finishing it (Roni's closing words, a final wave). */
export const COMPLETE_AT_RATIO = 0.9;

export function watchedEnough(seconds: number, durationSeconds: number): boolean {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return false;
  return seconds >= durationSeconds * COMPLETE_AT_RATIO;
}

/**
 * A lesson completes only after this share of its length was actually played (the database checks
 * it in complete_lesson). Lower than COMPLETE_AT_RATIO: resuming replays a few seconds.
 */
export const PLAYED_TO_COMPLETE_RATIO = 0.8;
/** Between two time updates, more than this is a seek, not playback (covers 2× speed). */
const MAX_PLAY_STEP_SECONDS = 3;

/** Seconds actually played between two time updates; seeks and a paused clock count as nothing. */
export function playedStep(previousSeconds: number, seconds: number): number {
  const step = seconds - previousSeconds;
  return step > 0 && step <= MAX_PLAY_STEP_SECONDS ? step : 0;
}

/** Played enough to complete; a video of unknown length asks nothing. */
export function playedEnough(playedSeconds: number, durationSeconds: number | null): boolean {
  if (!durationSeconds || durationSeconds <= 0) return true;
  return playedSeconds >= Math.floor(durationSeconds * PLAYED_TO_COMPLETE_RATIO);
}

/** Whole minutes still to watch before the lesson can be completed. */
export function minutesLeftToWatch(playedSeconds: number, durationSeconds: number): number {
  const left = Math.floor(durationSeconds * PLAYED_TO_COMPLETE_RATIO) - playedSeconds;
  return left > 0 ? Math.ceil(left / 60) : 0;
}

/** complete_lesson refused because the video wasn't watched yet. */
export function isWatchRequired(error: { hint?: string; message?: string } | null): boolean {
  return error?.hint === "watch_required";
}

const PLAYBACK_ERRORS: Record<number, string> = {
  401: "Your session ended. Sign in again to watch this lesson.",
  403: "This lesson isn't open for you yet.",
  404: "The video for this lesson is on its way. Read the lesson below in the meantime.",
};

/** The member-facing message for a failed playback request, by HTTP status. */
export function playbackErrorMessage(status: number): string {
  return PLAYBACK_ERRORS[status] ?? "We couldn't load this video. Refresh the page to try again.";
}
