import { addDays, weekdayOf } from "./dates";

/**
 * The weekly plan strip: what was practiced, what was planned explicitly (practice_plan), and
 * the member's default rhythm (profiles.practice_days × session_minutes). Pure.
 */
export interface DoneSession {
  id: string;
  practicedOn: string;
  title: string;
  durationSeconds: number;
}

export interface PlannedSession {
  id: string;
  plannedOn: string;
  title: string;
  minutes: number;
  lessonId: string | null;
}

export type WeekItem =
  | { kind: "done"; id: string; title: string; minutes: number }
  | { kind: "planned"; id: string; title: string; minutes: number; lessonId: string | null; past: boolean }
  | { kind: "default"; title: string; minutes: number; past: boolean };

export interface WeekDay {
  date: string;
  weekday: number;
  isToday: boolean;
  isPast: boolean;
  /** Nothing practiced, nothing planned and not one of the member's practice days. */
  isRest: boolean;
  items: WeekItem[];
}

export interface WeekInput {
  monday: string;
  today: string;
  sessions: readonly DoneSession[];
  planned: readonly PlannedSession[];
  practiceDays: readonly number[];
  sessionMinutes: number;
}

export const DEFAULT_SESSION_TITLE = "Practice session";

export function minutesOf(seconds: number): number {
  return seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : 0;
}

export function buildWeek(input: WeekInput): WeekDay[] {
  const practiceDays = new Set(input.practiceDays);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(input.monday, i);
    const weekday = weekdayOf(date);
    const isPast = date < input.today;
    const done: WeekItem[] = input.sessions
      .filter((s) => s.practicedOn === date)
      .map((s) => ({ kind: "done", id: s.id, title: s.title, minutes: minutesOf(s.durationSeconds) }));
    const planned: WeekItem[] = input.planned
      .filter((p) => p.plannedOn === date)
      .map((p) => ({ kind: "planned", id: p.id, title: p.title, minutes: p.minutes, lessonId: p.lessonId, past: isPast }));
    // The default rhythm only fills a practice day that has nothing else on it.
    const fallback: WeekItem[] =
      practiceDays.has(weekday) && done.length === 0 && planned.length === 0
        ? [{ kind: "default", title: DEFAULT_SESSION_TITLE, minutes: input.sessionMinutes, past: isPast }]
        : [];
    const items = [...done, ...planned, ...fallback];
    return { date, weekday, isToday: date === input.today, isPast, isRest: items.length === 0, items };
  });
}

/** Minutes practiced and planned sessions left this week, for the page summary. */
export function weekTotals(days: readonly WeekDay[]): { doneMinutes: number; doneSessions: number; upcoming: number } {
  let doneMinutes = 0;
  let doneSessions = 0;
  let upcoming = 0;
  for (const day of days) {
    for (const item of day.items) {
      if (item.kind === "done") {
        doneMinutes += item.minutes;
        doneSessions += 1;
      } else if (!item.past) {
        upcoming += 1;
      }
    }
  }
  return { doneMinutes, doneSessions, upcoming };
}
