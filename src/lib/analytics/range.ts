/** Date ranges for Analytics / Reports (UTC, [from, to) with whole days). Pure — safe for tests. */
export type Bucket = "day" | "week" | "month";
export type RangeKey = "7d" | "30d" | "90d" | "12m" | "custom";

export interface ResolvedRange {
  key: RangeKey;
  from: Date;
  to: Date;
  bucket: Bucket;
  previous: { from: Date; to: Date };
  label: string;
}

export const RANGE_PRESETS: readonly { key: Exclude<RangeKey, "custom">; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "12m", label: "Last 12 months" },
];

const DAY_MS = 86_400_000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function bucketFor(days: number): Bucket {
  if (days <= 31) return "day";
  if (days <= 120) return "week";
  return "month";
}

function withPrevious(key: RangeKey, from: Date, to: Date, label: string, bucket?: Bucket): ResolvedRange {
  const length = to.getTime() - from.getTime();
  return {
    key,
    from,
    to,
    bucket: bucket ?? bucketFor(Math.round(length / DAY_MS)),
    previous: { from: new Date(from.getTime() - length), to: from },
    label,
  };
}

export function resolveRange(params: { range?: string; from?: string; to?: string }, now: Date = new Date()): ResolvedRange {
  const tomorrow = new Date(startOfUtcDay(now).getTime() + DAY_MS);

  if (params.from && params.to && ISO_DAY.test(params.from) && ISO_DAY.test(params.to)) {
    const from = new Date(`${params.from}T00:00:00Z`);
    const to = new Date(new Date(`${params.to}T00:00:00Z`).getTime() + DAY_MS);
    if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from < to) {
      return withPrevious("custom", from, to, `${params.from} – ${params.to}`);
    }
  }

  switch (params.range) {
    case "7d":
      return withPrevious("7d", new Date(tomorrow.getTime() - 7 * DAY_MS), tomorrow, "Last 7 days");
    case "90d":
      return withPrevious("90d", new Date(tomorrow.getTime() - 90 * DAY_MS), tomorrow, "Last 90 days");
    case "12m": {
      const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
      return withPrevious("12m", from, tomorrow, "Last 12 months", "month");
    }
    default:
      return withPrevious("30d", new Date(tomorrow.getTime() - 30 * DAY_MS), tomorrow, "Last 30 days");
  }
}

/** Whole-percent change from `previous` to `current`; null when there's no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}
