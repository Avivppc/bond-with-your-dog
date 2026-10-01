/**
 * The member rows the reminder jobs work with (from the reminder_members RPC), validated at the
 * boundary, plus who hears about which live session. Pure.
 */
import { z } from "zod";
import { readNotifPrefs, type NotifPrefs } from "../feedback/prefs";

const MemberRow = z.object({
  user_id: z.string().uuid(),
  email: z.string().nullable(),
  first_name: z.string().nullable(),
  timezone: z.string().nullable(),
  practice_days: z.array(z.number().int()).nullable(),
  session_minutes: z.number().int().nullable(),
  notif_prefs: z.unknown(),
  has_courses: z.boolean(),
  in_community: z.boolean(),
  practiced_on: z.array(z.string()).nullable(),
});

export interface ReminderMember {
  userId: string;
  email: string | null;
  firstName: string | null;
  timezone: string | null;
  practiceDays: readonly number[];
  sessionMinutes: number;
  prefs: NotifPrefs;
  hasCourses: boolean;
  inCommunity: boolean;
  practicedOn: readonly string[];
}

const DEFAULT_SESSION_MINUTES = 10;

/** Parses one RPC row; returns null (and the caller logs) for a malformed row. */
export function parseMemberRow(raw: unknown): ReminderMember | null {
  const parsed = MemberRow.safeParse(raw);
  if (!parsed.success) return null;
  const r = parsed.data;
  return {
    userId: r.user_id,
    email: r.email,
    firstName: r.first_name,
    timezone: r.timezone,
    practiceDays: r.practice_days ?? [],
    sessionMinutes: r.session_minutes ?? DEFAULT_SESSION_MINUTES,
    prefs: readNotifPrefs(r.notif_prefs),
    hasCourses: r.has_courses,
    inCommunity: r.in_community,
    practicedOn: r.practiced_on ?? [],
  };
}

export type SessionKind = "meetup" | "live_qa";

/**
 * Live Q&A sessions go to every community member who wants Q&A reminders; ordinary meetups only to
 * those who said they're coming.
 */
export function wantsSessionReminder(member: ReminderMember, kind: SessionKind, rsvped: boolean): boolean {
  if (!member.prefs.live_qa || !member.inCommunity) return false;
  return kind === "live_qa" || rsvped;
}

/** Whether a reminder may also go out by email to this member. */
export function canEmail(member: ReminderMember, emailConfigured: boolean): boolean {
  return emailConfigured && member.prefs.reminder_emails && Boolean(member.email);
}
