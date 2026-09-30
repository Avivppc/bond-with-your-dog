/** The admin dashboard's metric selector (Kajabi's big card). Pure — safe for tests. */
export const DASHBOARD_METRICS = [
  { key: "gross", label: "Gross revenue", money: true },
  { key: "net", label: "Net revenue", money: true },
  { key: "orders", label: "Orders", money: false },
  { key: "contacts", label: "New contacts", money: false },
  { key: "lessons", label: "Lessons completed", money: false },
] as const;

export type DashboardMetric = (typeof DASHBOARD_METRICS)[number]["key"];

export const DASHBOARD_RANGES = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
] as const;

export type DashboardRange = (typeof DASHBOARD_RANGES)[number]["key"];

export function parseMetric(raw: unknown): DashboardMetric {
  return DASHBOARD_METRICS.find((m) => m.key === raw)?.key ?? "gross";
}

export function parseDashboardRange(raw: unknown): DashboardRange {
  return DASHBOARD_RANGES.find((r) => r.key === raw)?.key ?? "30d";
}

export function metricInfo(metric: DashboardMetric) {
  return DASHBOARD_METRICS.find((m) => m.key === metric) ?? DASHBOARD_METRICS[0];
}

/** One bucket of the source series (the analytics SQL functions, already typed). */
export interface MetricBucket {
  bucket: string;
  gross?: number;
  refunds?: number;
  orders?: number;
  contacts?: number;
  lessons?: number;
}

export function bucketValue(point: MetricBucket, metric: DashboardMetric): number {
  switch (metric) {
    case "gross":
      return point.gross ?? 0;
    case "net":
      return (point.gross ?? 0) - (point.refunds ?? 0);
    default:
      return point[metric] ?? 0;
  }
}

export interface ComparisonPoint {
  bucket: string;
  current: number;
  /** The same position in the previous period (null when that period is shorter). */
  previous: number | null;
}

/**
 * Lines up the current and previous periods bucket by bucket (day 1 with day 1 …) so both
 * lines share the x-axis, the way Kajabi draws "previous period".
 */
export function compareSeries(current: readonly MetricBucket[], previous: readonly MetricBucket[], metric: DashboardMetric): ComparisonPoint[] {
  return current.map((point, i) => ({
    bucket: point.bucket,
    current: bucketValue(point, metric),
    previous: i < previous.length ? bucketValue(previous[i], metric) : null,
  }));
}

export function seriesTotal(points: readonly ComparisonPoint[], key: "current" | "previous"): number {
  return points.reduce((sum, p) => sum + (p[key] ?? 0), 0);
}
