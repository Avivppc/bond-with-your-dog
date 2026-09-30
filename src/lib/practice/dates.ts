/**
 * Calendar-date helpers for practice screens. Dates are ISO "YYYY-MM-DD" strings (the
 * `practiced_on` / `planned_on` columns) so the math never drifts across time zones. Pure.
 */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function toUtc(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function addDays(iso: string, days: number): string {
  return new Date(toUtc(iso).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / DAY_MS);
}

/** 0 = Sunday … 6 = Saturday (same numbering as profiles.practice_days). */
export function weekdayOf(iso: string): number {
  return toUtc(iso).getUTCDay();
}

/** Monday of the week that contains `iso`. */
export function mondayOf(iso: string): string {
  const offset = (weekdayOf(iso) + 6) % 7;
  return addDays(iso, -offset);
}

export function dayOfMonth(iso: string): number {
  return Number(iso.slice(8, 10));
}

export function isValidTimeZone(tz: string): boolean {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The calendar date of `instant` in `timeZone` (falls back to UTC for unknown zones). */
export function isoDateInZone(instant: Date, timeZone: string): string {
  const zone = isValidTimeZone(timeZone) ? timeZone : "UTC";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Hour of day (0–23) of `instant` in `timeZone`. */
export function hourInZone(instant: Date, timeZone: string): number {
  const zone = isValidTimeZone(timeZone) ? timeZone : "UTC";
  const hour = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", hourCycle: "h23" }).format(instant);
  return Number(hour) % 24;
}

/** The local calendar date in the browser (used when a session is saved). */
export function localIsoDate(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export interface MonthRef {
  year: number;
  /** 1–12 */
  month: number;
}

export function parseMonth(value: string | undefined, fallback: MonthRef): MonthRef {
  const m = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!m) return fallback;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (year < 2000 || year > 2100 || month < 1 || month > 12) return fallback;
  return { year, month };
}

export function monthOf(iso: string): MonthRef {
  return { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) };
}

export function monthKey({ year, month }: MonthRef): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function daysInMonth({ year, month }: MonthRef): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function firstOfMonth(ref: MonthRef): string {
  return `${monthKey(ref)}-01`;
}

export function lastOfMonth(ref: MonthRef): string {
  return `${monthKey(ref)}-${String(daysInMonth(ref)).padStart(2, "0")}`;
}

/** "Mon 22" style label. */
export function shortDayLabel(iso: string): string {
  return `${WEEKDAY_SHORT[weekdayOf(iso)]} ${dayOfMonth(iso)}`;
}

/** "September 2" style label. */
export function longDateLabel(iso: string): string {
  return `${MONTH_NAMES[Number(iso.slice(5, 7)) - 1]} ${dayOfMonth(iso)}`;
}
