/**
 * Time windows for the reminder jobs, which run every hour. The delivery log makes overlapping or
 * extra runs harmless; timing choices come from Admin → Member notifications. Pure.
 */
import { addDays, isoDateInZone } from "../practice/dates";
import { localNow } from "./zone";

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** Drip lessons that opened this long ago still get their "new lesson" notice (covers missed runs). */
export const UNLOCK_LOOKBACK_HOURS = 72;
/** Sessions this far ahead are loaded; the day-before reminder needs up to two days. */
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

export interface LiveTiming {
  dayBefore: boolean;
  /** 0–23, in the member's zone */
  dayBeforeHour: number;
  dayOf: boolean;
  /** the day-of reminder goes this many hours before the start */
  hoursBefore: number;
}

/**
 * Which reminder a session is due for, for a member in `zone`: "day_of" within `hoursBefore` of
 * the start; "day_before" when it starts tomorrow (their calendar) and it's past the chosen hour.
 */
export function liveStage(startsAt: Date, now: Date, zone: string, timing: LiveTiming): QaStage | null {
  const until = startsAt.getTime() - now.getTime();
  if (until <= 0) return null;
  if (timing.dayOf && until <= timing.hoursBefore * HOUR_MS) return "day_of";
  if (!timing.dayBefore) return null;
  // An early-morning session with a long day-of lead: the day-of reminder is due within the hour.
  if (timing.dayOf && until <= (timing.hoursBefore + 1) * HOUR_MS) return null;
  const local = localNow(now, zone);
  return isoDateInZone(startsAt, local.zone) === addDays(local.date, 1) && local.hour >= timing.dayBeforeHour ? "day_before" : null;
}

/** Videos created before this instant have waited too long. */
export function feedbackOverdueCutoff(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

/** Whole days a video has been waiting. */
export function daysWaiting(createdAt: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / DAY_MS));
}

/** Local hour gate for "from this hour" notices (new lessons). */
export function pastLocalHour(now: Date, timezone: string | null, hour: number): boolean {
  return localNow(now, timezone).hour >= hour;
}
