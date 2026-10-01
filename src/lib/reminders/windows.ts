/**
 * Time windows for the once-a-day reminder jobs. Each window is at least a day wide so a daily run
 * never misses anything; the delivery log makes overlaps (or extra runs) harmless. Pure.
 */

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** Drip lessons that opened this long ago still get their "new lesson" notice (covers missed runs). */
export const UNLOCK_LOOKBACK_HOURS = 72;
/** Feedback videos waiting longer than this are flagged to the team. */
export const FEEDBACK_OVERDUE_DAYS = 5;
/**
 * Live-session reminder bands. Vercel Hobby crons fire somewhere within the scheduled hour, so runs
 * are 23–25 hours apart; two hours of slack keeps every session inside one run's band.
 */
export const QA_DAY_OF_HOURS = 26;
export const QA_LOOKAHEAD_HOURS = 50;

export interface TimeWindow {
  since: Date;
  until: Date;
}

/** Lessons that unlocked in (now − lookback, now] are announced. */
export function unlockWindow(now: Date): TimeWindow {
  return { since: new Date(now.getTime() - UNLOCK_LOOKBACK_HOURS * HOUR_MS), until: now };
}

/** Sessions starting in (now, now + lookahead] are candidates for a reminder. */
export function qaWindow(now: Date): TimeWindow {
  return { since: now, until: new Date(now.getTime() + QA_LOOKAHEAD_HOURS * HOUR_MS) };
}

export type QaStage = "day_before" | "day_of";

/**
 * Which reminder a session is due for: "day_of" when it starts within QA_DAY_OF_HOURS, "day_before"
 * up to QA_LOOKAHEAD_HOURS ahead, otherwise none. Bands are by hours, not calendar days, so a daily
 * run reaches each band once wherever the member lives; the wording names the member's local day.
 */
export function qaStage(startsAt: Date, now: Date): QaStage | null {
  const until = startsAt.getTime() - now.getTime();
  if (until <= 0) return null;
  if (until <= QA_DAY_OF_HOURS * HOUR_MS) return "day_of";
  if (until <= QA_LOOKAHEAD_HOURS * HOUR_MS) return "day_before";
  return null;
}

/** Videos created before this instant have waited too long. */
export function feedbackOverdueCutoff(now: Date): Date {
  return new Date(now.getTime() - FEEDBACK_OVERDUE_DAYS * DAY_MS);
}

/** Whole days a video has been waiting. */
export function daysWaiting(createdAt: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / DAY_MS));
}
