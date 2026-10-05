/**
 * 1:1 coaching: Roni's weekly hours (in her time zone) turned into bookable times, and the rules
 * for the settings form. Pure — the booking page, the admin and tests share it; the database
 * (book_coaching_session) checks the same rules when a time is booked.
 */
import { z } from "zod";
import { addDays, isValidTimeZone, isoDateInZone, weekdayOf } from "../practice/dates";

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const weeklyWindowSchema = z
  .object({ day: z.number().int().min(0).max(6), start: z.string().regex(HHMM), end: z.string().regex(HHMM) })
  .refine((w) => minutes(w.end) > minutes(w.start), "Each window ends after it starts.");

export const coachingSettingsSchema = z.object({
  enabled: z.boolean(),
  title: z.string().trim().min(1, "Give the session a name.").max(80),
  description: z.string().trim().max(1000).nullable(),
  duration_minutes: z.number().int().min(15, "Sessions are 15–180 minutes.").max(180, "Sessions are 15–180 minutes."),
  buffer_minutes: z.number().int().min(0).max(120),
  price_cents: z.number().int().positive("Set a price."),
  currency: z.string().regex(/^[A-Z]{3}$/),
  timezone: z.string().refine(isValidTimeZone, "Choose a valid time zone."),
  weekly: z.array(weeklyWindowSchema).max(42),
  min_notice_hours: z.number().int().min(0).max(336),
  max_days_ahead: z.number().int().min(1).max(180),
  cancel_hours: z.number().int().min(0).max(336),
  meeting_url: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v.startsWith("https://"), "The meeting link starts with https://")
    .nullable(),
});

export type CoachingSettings = z.infer<typeof coachingSettingsSchema>;
export type WeeklyWindow = z.infer<typeof weeklyWindowSchema>;

export interface TimeOff {
  starts_on: string;
  ends_on: string;
}

export interface Busy {
  starts_at: string;
  ends_at: string;
}

export function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** The UTC offset of `zone` at an instant, in minutes (Jerusalem in summer: +180). */
function offsetMinutes(instant: number, zone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - instant) / 60_000);
}

/** The instant a wall-clock time on a date has in a zone (around DST, the later reading wins). */
export function zonedTime(isoDate: string, minuteOfDay: number, zone: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d, Math.floor(minuteOfDay / 60), minuteOfDay % 60);
  const first = wall - offsetMinutes(wall, zone) * 60_000;
  return new Date(wall - offsetMinutes(first, zone) * 60_000);
}

export interface Slot {
  /** Roni's date (YYYY-MM-DD) the slot falls on. */
  day: string;
  startsAt: string;
}

/**
 * Every bookable start from now on: on the grid of length + buffer inside each weekly window,
 * after the notice, within the horizon, not on time off, and not overlapping a booking.
 */
export function openSlots(
  settings: Pick<CoachingSettings, "timezone" | "weekly" | "duration_minutes" | "buffer_minutes" | "min_notice_hours" | "max_days_ahead">,
  timeOff: readonly TimeOff[],
  busy: readonly Busy[],
  now: Date,
): Slot[] {
  const zone = settings.timezone;
  const earliest = now.getTime() + settings.min_notice_hours * 3_600_000;
  const latest = now.getTime() + settings.max_days_ahead * 86_400_000;
  const step = settings.duration_minutes + settings.buffer_minutes;
  const length = settings.duration_minutes * 60_000;
  const taken = busy.map((b) => [new Date(b.starts_at).getTime(), new Date(b.ends_at).getTime()] as const);
  const today = isoDateInZone(now, zone);

  return Array.from({ length: settings.max_days_ahead + 1 }, (_, i) => addDays(today, i)).flatMap((day) => {
    if (timeOff.some((t) => day >= t.starts_on && day <= t.ends_on)) return [];
    const dow = weekdayOf(day);
    return settings.weekly
      .filter((w) => w.day === dow)
      .flatMap((w) => {
        const starts: number[] = [];
        for (let m = minutes(w.start); m + settings.duration_minutes <= minutes(w.end); m += step) starts.push(m);
        return starts;
      })
      .map((m) => zonedTime(day, m, zone).getTime())
      .filter((t) => t >= earliest && t <= latest && !taken.some(([s, e]) => t < e && t + length > s))
      .sort((a, b) => a - b)
      .map((t) => ({ day, startsAt: new Date(t).toISOString() }));
  });
}

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
