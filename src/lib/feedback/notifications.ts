/** Notifications inbox grouping: Today / This week / Earlier, in the viewer's time zone. Pure. */

export type NotificationGroupKey = "today" | "week" | "earlier";

export interface GroupedNotifications<T> {
  key: NotificationGroupKey;
  label: string;
  items: T[];
}

const LABELS: Record<NotificationGroupKey, string> = { today: "Today", week: "This week", earlier: "Earlier" };
const ORDER: NotificationGroupKey[] = ["today", "week", "earlier"];
const DAY_MS = 86_400_000;

/** Calendar day (YYYY-MM-DD) of an instant in a time zone. */
export function dayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Whole calendar days from day a to day b (both YYYY-MM-DD). */
export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY_MS);
}

export function groupKeyFor(createdAt: string, now: Date, timeZone: string): NotificationGroupKey {
  const diff = daysBetween(dayKey(new Date(createdAt), timeZone), dayKey(now, timeZone));
  if (diff <= 0) return "today";
  if (diff < 7) return "week";
  return "earlier";
}

/** Groups newest-first items, keeping their order; empty groups are left out. */
export function groupNotifications<T extends { created_at: string }>(
  items: readonly T[],
  now: Date,
  timeZone: string
): GroupedNotifications<T>[] {
  const buckets = new Map<NotificationGroupKey, T[]>(ORDER.map((k) => [k, []]));
  for (const item of items) buckets.get(groupKeyFor(item.created_at, now, timeZone))?.push(item);
  return ORDER.filter((k) => (buckets.get(k) ?? []).length > 0).map((k) => ({ key: k, label: LABELS[k], items: buckets.get(k) ?? [] }));
}

/** Icon for a notification kind (the design's circle icons). */
export function notificationIcon(kind: string): string {
  switch (kind) {
    case "feedback":
      return "rate_review";
    case "answer":
      return "question_answer";
    case "achievement":
      return "workspace_premium";
    case "lesson":
      return "lock_clock";
    case "event":
      return "live_tv";
    case "support":
      return "support_agent";
    default:
      return "notifications";
  }
}

/** Only in-app paths are followed from a notification. */
export function safeNotificationHref(href: string | null | undefined): string | null {
  if (!href || !href.startsWith("/") || href.startsWith("//")) return null;
  return href;
}
