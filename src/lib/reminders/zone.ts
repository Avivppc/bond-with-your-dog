/**
 * Time-zone helpers for the reminder jobs. A member's zone comes from profiles.timezone; unknown
 * or missing zones fall back to UTC. Pure.
 */
import { addDays, hourInZone, isValidTimeZone, isoDateInZone } from "../practice/dates";

export const FALLBACK_ZONE = "UTC";

/** The zone to use for a member: their saved zone when it is a real IANA name, else UTC. */
export function memberZone(timezone: string | null | undefined): string {
  return timezone && isValidTimeZone(timezone) ? timezone : FALLBACK_ZONE;
}

export interface LocalNow {
  zone: string;
  /** YYYY-MM-DD in the member's zone */
  date: string;
  /** 0–23 in the member's zone */
  hour: number;
}

export function localNow(now: Date, timezone: string | null | undefined): LocalNow {
  const zone = memberZone(timezone);
  return { zone, date: isoDateInZone(now, zone), hour: hourInZone(now, zone) };
}

/** "today" / "tomorrow" / "on Friday" for an instant, as seen from `now` in `zone`. */
export function relativeDayWord(instant: Date, now: Date, zone: string): string {
  const today = isoDateInZone(now, zone);
  const day = isoDateInZone(instant, zone);
  if (day === today) return "today";
  if (day === addDays(today, 1)) return "tomorrow";
  return `on ${new Intl.DateTimeFormat("en-US", { timeZone: zone, weekday: "long" }).format(instant)}`;
}

/** "8:00 PM" in the member's zone, plus the zone's short name when it isn't obvious ("GMT+3"). */
export function clockTime(instant: Date, zone: string): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(instant);
}
