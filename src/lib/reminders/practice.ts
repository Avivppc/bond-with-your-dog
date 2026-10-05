/**
 * Practice reminders: who is due, and for which local date. Pure.
 *
 * The job runs every hour. From the hour the team chose (Admin → Member notifications), in the
 * member's own zone, a member is reminded on a practice day itself or the evening before. The
 * reminder is keyed by the local date it is about, so later runs that day never repeat it.
 */
import { addDays, weekdayOf } from "../practice/dates";
import { localNow } from "./zone";

export type PracticeWhen = "today" | "tomorrow";

export interface PracticeTarget {
  /** the member's local date the reminder is about (YYYY-MM-DD) */
  date: string;
  when: PracticeWhen;
}

export interface PracticeTiming {
  when: "day_of" | "day_before";
  /** 0–23, in the member's zone */
  hour: number;
}

export interface PracticeMember {
  timezone: string | null;
  practiceDays: readonly number[];
  /** dates (YYYY-MM-DD) with at least one practice session, around today */
  practicedOn: readonly string[];
  hasCourses: boolean;
  wantsReminders: boolean;
}

/** The local date a reminder sent now would be about, or null before the chosen hour. */
export function practiceTarget(now: Date, timezone: string | null, timing: PracticeTiming): PracticeTarget | null {
  const local = localNow(now, timezone);
  if (local.hour < timing.hour) return null;
  return timing.when === "day_of" ? { date: local.date, when: "today" } : { date: addDays(local.date, 1), when: "tomorrow" };
}

/**
 * The reminder due for this member now, or null: they opted in, have a course, it's past the hour,
 * the target date is one of their practice days, and (for today) they haven't practiced yet.
 */
export function practiceReminderDue(member: PracticeMember, now: Date, timing: PracticeTiming): PracticeTarget | null {
  if (!member.wantsReminders || !member.hasCourses) return null;
  const target = practiceTarget(now, member.timezone, timing);
  if (!target) return null;
  if (!member.practiceDays.includes(weekdayOf(target.date))) return null;
  if (member.practicedOn.includes(target.date)) return null;
  return target;
}
