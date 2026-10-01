/**
 * Practice reminders: who is due, and for which local date. Pure.
 *
 * The job runs once a day at a fixed UTC hour, so for some members it lands late in their evening.
 * From EVENING_HOUR on we remind them about tomorrow instead of a day that is nearly over.
 * Either way the reminder is keyed by that local date, so running more often never repeats it.
 */
import { addDays, weekdayOf } from "../practice/dates";
import { localNow } from "./zone";

export const EVENING_HOUR = 18;

export type PracticeWhen = "today" | "tomorrow";

export interface PracticeTarget {
  /** the member's local date the reminder is about (YYYY-MM-DD) */
  date: string;
  when: PracticeWhen;
}

export interface PracticeMember {
  timezone: string | null;
  practiceDays: readonly number[];
  /** dates (YYYY-MM-DD) with at least one practice session, around today */
  practicedOn: readonly string[];
  hasCourses: boolean;
  wantsReminders: boolean;
}

/** The local date a reminder sent now would be about. */
export function practiceTarget(now: Date, timezone: string | null): PracticeTarget {
  const local = localNow(now, timezone);
  return local.hour >= EVENING_HOUR ? { date: addDays(local.date, 1), when: "tomorrow" } : { date: local.date, when: "today" };
}

/**
 * The reminder due for this member now, or null: they opted in, have a course, the target date is
 * one of their practice days, and (for today) they haven't already practiced.
 */
export function practiceReminderDue(member: PracticeMember, now: Date): PracticeTarget | null {
  if (!member.wantsReminders || !member.hasCourses) return null;
  const target = practiceTarget(now, member.timezone);
  if (!member.practiceDays.includes(weekdayOf(target.date))) return null;
  if (member.practicedOn.includes(target.date)) return null;
  return target;
}
