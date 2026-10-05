import { hourInZone } from "../practice/dates";
import { memberZone } from "../reminders/zone";

/**
 * "Wait until 10:00 their time" (optionally on a given weekday) for flow wait steps. Pure: steps
 * hour by hour from now to the first moment that's the right local hour and day.
 */

export const WEEKDAY_LABEL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const HOURS_TO_SEARCH = 8 * 24 + 2;

export function weekdayInZone(at: Date, zone: string): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "short" }).format(at);
  return SHORT_DAYS.indexOf(name);
}

/** The next on-the-hour moment after `now` that is `hour`:00 (on `weekday`, if given) in the person's zone. */
export function nextLocalTime(now: Date, timezone: string | null | undefined, hour: number, weekday: number | null = null): Date {
  const zone = memberZone(timezone);
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  for (let step = 0; step < HOURS_TO_SEARCH; step++) {
    next.setUTCHours(next.getUTCHours() + 1);
    if (hourInZone(next, zone) === hour && (weekday === null || weekdayInZone(next, zone) === weekday)) return new Date(next);
  }
  // Zones without that exact hour (e.g. a daylight-saving gap): a day later is close enough.
  return new Date(now.getTime() + 24 * 60 * 60 * 1000);
}

const WALL_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
/** The earliest time zone is UTC+14 (Kiribati): a local time arrives there first. */
const EARLIEST_OFFSET_MS = 14 * 60 * 60 * 1000;

/**
 * For a campaign sent at a local wall-clock time ("2026-10-05T10:00") in every time zone: the first
 * moment anyone reaches it, which is when the campaign starts going out. null for a malformed value.
 */
export function earliestArrival(wall: string): Date | null {
  const m = WALL_TIME.exec(wall);
  if (!m) return null;
  const utc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
  return Number.isNaN(utc) ? null : new Date(utc - EARLIEST_OFFSET_MS);
}

/** "10:00 their time", "Monday 10:00 their time". */
export function describeLocalTime(hour: number, weekday: number | null): string {
  const time = `${String(hour).padStart(2, "0")}:00`;
  return `${weekday === null ? "" : `${WEEKDAY_LABEL[weekday]} `}${time} their time`;
}
