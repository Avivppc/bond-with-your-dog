/** Counting what a reminder job did, and running work a few items at a time. Pure. */

export type DeliveryOutcome = "sent" | "already_sent" | "failed";

export interface JobCounts {
  /** reminders newly delivered in the app */
  notified: number;
  /** reminders skipped because an earlier run already sent them */
  alreadySent: number;
  /** deliveries that errored (logged) */
  failed: number;
  /** emails Resend accepted */
  emailed: number;
}

export const EMPTY_COUNTS: JobCounts = { notified: 0, alreadySent: 0, failed: 0, emailed: 0 };

/** Folds delivery outcomes into counts (a new object; inputs are untouched). */
export function countOutcomes(outcomes: readonly DeliveryOutcome[], emailed = 0): JobCounts {
  return {
    notified: outcomes.filter((o) => o === "sent").length,
    alreadySent: outcomes.filter((o) => o === "already_sent").length,
    failed: outcomes.filter((o) => o === "failed").length,
    emailed,
  };
}

/** Runs `fn` over `items`, at most `size` at a time, keeping the input order in the results. */
export async function mapInChunks<T, R>(items: readonly T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const step = Math.max(1, Math.floor(size));
  let results: R[] = [];
  for (let start = 0; start < items.length; start += step) {
    const chunk = await Promise.all(items.slice(start, start + step).map(fn));
    results = [...results, ...chunk];
  }
  return results;
}
