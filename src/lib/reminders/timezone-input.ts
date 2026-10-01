/** Validating the time zone a browser or the Settings page sends. Pure (shared with server actions). */
import { z } from "zod";
import { isValidTimeZone } from "../practice/dates";

/** Same loose shape the database checks (profiles_timezone_check). */
const IANA_SHAPE = /^[A-Za-z][A-Za-z0-9_+-]*(\/[A-Za-z0-9_+-]+){0,2}$/;

/** The canonical IANA name for a zone the runtime knows ("asia/jerusalem" → "Asia/Jerusalem"), else null. */
export function normalizeTimeZone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!isValidTimeZone(trimmed)) return null;
  const canonical = new Intl.DateTimeFormat("en-US", { timeZone: trimmed }).resolvedOptions().timeZone;
  return IANA_SHAPE.test(canonical) ? canonical : null;
}

export const TimeZoneInput = z
  .string()
  .max(64)
  .transform((value, ctx) => {
    const zone = normalizeTimeZone(value);
    if (!zone) {
      ctx.addIssue({ code: "custom", message: "Please pick a time zone from the list." });
      return z.NEVER;
    }
    return zone;
  });

/** Every zone the runtime knows, for the Settings picker, always including UTC and the current one. */
export function timeZoneOptions(current: string | null): string[] {
  const known = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  const all = new Set([...known, "UTC", ...(current ? [current] : [])]);
  return [...all].sort((a, b) => a.localeCompare(b));
}
