import { daysInMonth, firstOfMonth, hourInZone, monthKey, weekdayOf, type MonthRef } from "./dates";
import { longestStreak } from "./streaks";
import { minutesOf } from "./week-plan";

/** Month calendar heatmap + "This month" stats for the plan page. Pure. */
export interface MonthSession {
  practicedOn: string;
  durationSeconds: number;
  createdAt: string;
}

export type HeatLevel = 0 | 1 | 2 | 3;

/** Minutes practiced in a day → heat level (Less … More legend). */
export const HEAT_THRESHOLDS = { l2: 10, l3: 20 } as const;

export function heatLevel(minutes: number, sessions: number): HeatLevel {
  if (sessions === 0) return 0;
  if (minutes >= HEAT_THRESHOLDS.l3) return 3;
  if (minutes >= HEAT_THRESHOLDS.l2) return 2;
  return 1;
}

export interface CalendarCell {
  date: string;
  day: number;
  level: HeatLevel;
  minutes: number;
  sessions: number;
}

export interface MonthCalendar {
  /** Empty cells before day 1 so the grid starts on Monday. */
  leadingBlanks: number;
  cells: CalendarCell[];
}

export function inMonth(ref: MonthRef, iso: string): boolean {
  return iso.startsWith(`${monthKey(ref)}-`);
}

export function buildMonthCalendar(ref: MonthRef, sessions: readonly MonthSession[]): MonthCalendar {
  const byDay = new Map<string, { minutes: number; sessions: number }>();
  for (const s of sessions) {
    if (!inMonth(ref, s.practicedOn)) continue;
    const cur = byDay.get(s.practicedOn) ?? { minutes: 0, sessions: 0 };
    byDay.set(s.practicedOn, { minutes: cur.minutes + s.durationSeconds / 60, sessions: cur.sessions + 1 });
  }
  const first = firstOfMonth(ref);
  const cells = Array.from({ length: daysInMonth(ref) }, (_, i) => {
    const date = `${monthKey(ref)}-${String(i + 1).padStart(2, "0")}`;
    const stats = byDay.get(date) ?? { minutes: 0, sessions: 0 };
    const minutes = Math.round(stats.minutes);
    return { date, day: i + 1, level: heatLevel(minutes, stats.sessions), minutes, sessions: stats.sessions };
  });
  return { leadingBlanks: (weekdayOf(first) + 6) % 7, cells };
}

export interface MonthStats {
  sessions: number;
  minutes: number;
  longestRhythm: number;
  averageMinutes: number;
}

export function monthStats(ref: MonthRef, sessions: readonly MonthSession[]): MonthStats {
  const inside = sessions.filter((s) => inMonth(ref, s.practicedOn));
  // Same rounding as the week strip: every logged session counts at least a minute.
  const minutes = inside.reduce((sum, s) => sum + minutesOf(s.durationSeconds), 0);
  const seconds = inside.reduce((sum, s) => sum + s.durationSeconds, 0);
  return {
    sessions: inside.length,
    minutes,
    longestRhythm: longestStreak(inside.map((s) => s.practicedOn)),
    averageMinutes: inside.length ? minutesOf(Math.round(seconds / inside.length)) : 0,
  };
}

export type DayPart = "morning" | "afternoon" | "evening";

/** Fewer sessions than this and a "best time" claim would be noise. */
export const MIN_SESSIONS_FOR_TIME_TIP = 3;

export function dayPartOf(hour: number): DayPart {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

/**
 * When most sessions were logged (in the viewer's zone). Null until there's enough data or when
 * no part of the day clearly leads.
 */
export function busiestDayPart(createdAts: readonly string[], timeZone: string): { part: DayPart; count: number; total: number } | null {
  if (createdAts.length < MIN_SESSIONS_FOR_TIME_TIP) return null;
  const counts: Record<DayPart, number> = { morning: 0, afternoon: 0, evening: 0 };
  for (const at of createdAts) counts[dayPartOf(hourInZone(new Date(at), timeZone))] += 1;
  const ranked = (Object.entries(counts) as [DayPart, number][]).sort((a, b) => b[1] - a[1]);
  if (ranked[0][1] === ranked[1][1]) return null;
  return { part: ranked[0][0], count: ranked[0][1], total: createdAts.length };
}
