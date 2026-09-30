import "server-only";
import { cookies } from "next/headers";
import { isoDateInZone, isValidTimeZone } from "../dates";
import { TZ_COOKIE } from "../zone-cookie";

/** The viewer's time zone (set by <TimeZoneSync/> in the browser), UTC until it is known. */
export async function viewerTimeZone(): Promise<string> {
  const value = (await cookies()).get(TZ_COOKIE)?.value ?? "";
  let decoded = "";
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return "UTC"; // malformed cookie
  }
  return isValidTimeZone(decoded) ? decoded : "UTC";
}

/** Today's calendar date where the viewer is. */
export async function viewerToday(): Promise<{ today: string; timeZone: string }> {
  const timeZone = await viewerTimeZone();
  return { today: isoDateInZone(new Date(), timeZone), timeZone };
}
