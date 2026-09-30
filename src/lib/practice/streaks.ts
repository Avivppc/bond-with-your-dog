import { addDays, daysBetween } from "./dates";

/** Unique practice dates, oldest first. */
function uniqueSorted(dates: readonly string[]): string[] {
  return [...new Set(dates)].sort();
}

/** Longest run of consecutive practice days ("longest rhythm"). */
export function longestStreak(dates: readonly string[]): number {
  const days = uniqueSorted(dates);
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of days) {
    run = prev !== null && daysBetween(prev, day) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

/**
 * The run that is still alive today: it ends today or, if today has no session yet,
 * yesterday (the member still has today to keep it going).
 */
export function currentStreak(dates: readonly string[], today: string): number {
  const set = new Set(dates);
  let day = set.has(today) ? today : addDays(today, -1);
  let run = 0;
  while (set.has(day)) {
    run += 1;
    day = addDays(day, -1);
  }
  return run;
}
