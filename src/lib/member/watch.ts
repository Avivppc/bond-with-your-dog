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

const PLAYBACK_ERRORS: Record<number, string> = {
  401: "Your session ended. Sign in again to watch this lesson.",
  403: "This lesson isn't open for you yet.",
  404: "The video for this lesson is on its way. Read the lesson below in the meantime.",
};

/** The member-facing message for a failed playback request, by HTTP status. */
export function playbackErrorMessage(status: number): string {
  return PLAYBACK_ERRORS[status] ?? "We couldn't load this video. Refresh the page to try again.";
}
