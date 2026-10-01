/** Week math for the Home "This week" card (Monday-first weeks, local calendar dates as YYYY-MM-DD). */

export interface WeekDay {
  weekday: number; // 0 = Sunday
  date: string; // YYYY-MM-DD
  done: boolean;
  planned: boolean;
  today: boolean;
  minutes: number;
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Monday of the week containing `d` (local time). */
export function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const offset = (out.getDay() + 6) % 7; // Mon → 0 … Sun → 6
  out.setDate(out.getDate() - offset);
  return out;
}

interface WeekInput {
  today: Date;
  /** Dates (YYYY-MM-DD) with at least one practice session. */
  practicedOn: readonly string[];
  /** Explicitly planned sessions this week. */
  planned: readonly { date: string; minutes: number }[];
  /** The member's usual practice days (0 = Sunday) and session length. */
  practiceDays: readonly number[];
  sessionMinutes: number;
}

/** Seven days, Monday first: practiced, planned (explicit or a usual day still ahead), today. */
export function buildWeek({ today, practicedOn, planned, practiceDays, sessionMinutes }: WeekInput): WeekDay[] {
  const monday = startOfWeek(today);
  const todayIso = isoDate(today);
  const done = new Set(practicedOn);
  const plannedByDate = new Map(planned.map((p) => [p.date, p.minutes]));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    const date = isoDate(day);
    const weekday = day.getDay();
    const explicit = plannedByDate.get(date);
    const usual = practiceDays.includes(weekday) && date >= todayIso;
    return {
      weekday,
      date,
      done: done.has(date),
      planned: !done.has(date) && (explicit !== undefined || usual),
      today: date === todayIso,
      minutes: explicit ?? sessionMinutes,
    };
  });
}

/** "3 of 4 sessions done": practiced days vs. practiced + still-planned days. */
export function weekTally(week: readonly WeekDay[]): { done: number; target: number } {
  const done = week.filter((d) => d.done).length;
  return { done, target: done + week.filter((d) => d.planned).length };
}

/** The next planned day from today on, if any. */
export function nextPlanned(week: readonly WeekDay[]): WeekDay | null {
  return week.find((d) => d.planned) ?? null;
}
