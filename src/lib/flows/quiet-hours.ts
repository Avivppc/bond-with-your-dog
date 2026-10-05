import { hourInZone } from "../practice/dates";
import { memberZone } from "../reminders/zone";

/**
 * Quiet hours for flow emails: they go out between 9:00 and 20:00 in the person's time zone (their
 * saved zone, else UTC); at night they wait for the next 9:00 there. Pure.
 */

export const SEND_FROM_HOUR = 9;
export const SEND_UNTIL_HOUR = 20;

/** null when it's a fine time to send; otherwise the next on-the-hour moment that is 9:00 locally. */
export function quietHoldUntil(now: Date, timezone: string | null | undefined): string | null {
  const zone = memberZone(timezone);
  const hour = hourInZone(now, zone);
  if (hour >= SEND_FROM_HOUR && hour < SEND_UNTIL_HOUR) return null;
  const next = new Date(now);
  next.setUTCMinutes(0, 0, 0);
  for (let step = 0; step < 48; step++) {
    next.setUTCHours(next.getUTCHours() + 1);
    if (hourInZone(next, zone) === SEND_FROM_HOUR) return next.toISOString();
  }
  return null;
}
