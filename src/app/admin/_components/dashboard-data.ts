import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import * as q from "@/lib/analytics/queries";
import type { Bucket } from "@/lib/analytics/range";
import type { DashboardMetric, MetricBucket } from "@/lib/admin-helpers/dashboard-metrics";
import { displayFirstName } from "@/lib/admin-helpers/display";
import type { ActivityRow, SetupFacts } from "@/lib/admin-dashboard";
import { hasPostalAddress, loadEmailSettings } from "@/lib/flows/server/email-settings";
import { loadJobRun } from "@/lib/job-runs";
import { turnstileEnabled } from "@/lib/turnstile";

type Window = { from: Date; to: Date };

/** One period of the selected metric, as MetricBuckets (see compareSeries). */
export async function metricSeries(metric: DashboardMetric, w: Window, bucket: Bucket, currency: string): Promise<MetricBucket[]> {
  switch (metric) {
    case "gross":
    case "net":
      return (await q.revenueSeries(w, bucket, currency)).map((p) => ({ bucket: p.bucket, gross: p.gross, refunds: p.refunds }));
    case "orders":
      return (await q.offerPurchasesSeries(w, bucket, currency)).map((p) => ({ bucket: p.bucket, orders: p.paid + p.free }));
    case "contacts":
      return (await q.contactsSeries(w, bucket)).map((p) => ({ bucket: p.bucket, contacts: p.signups + p.leads }));
    case "lessons":
      return (await q.completionsSeries(w, bucket)).map((p) => ({ bucket: p.bucket, lessons: p.completions }));
  }
}

export interface DashboardCounts {
  activeStudents: number;
  videosWaiting: number;
  openInbox: number;
  communityMembers: number;
}

/** Counts for the right-column cards (null when the query failed — shown as "—", never a made-up 0). */
export async function dashboardCounts(): Promise<DashboardCounts | null> {
  const { data, error } = await createServiceClient().rpc("admin_dashboard_counts");
  const row = (data as Record<string, number>[] | null)?.[0];
  if (error || !row) {
    console.error("[admin] dashboard counts failed", error?.message ?? "no row");
    return null;
  }
  return {
    activeStudents: Number(row.active_students),
    videosWaiting: Number(row.videos_waiting),
    openInbox: Number(row.open_inbox),
    communityMembers: Number(row.community_members),
  };
}

/** Net revenue (charges minus refunds) since the first payment, in one currency. */
export async function netRevenueAllTime(currency: string, to: Date): Promise<number> {
  const totals = await q.revenueTotals({ from: new Date(0), to }, currency);
  return totals.gross - totals.refunds;
}

/** "Roni" from the profile's full name (capitalised); falls back to the account's metadata, then the email. */
export async function staffFirstName(userId: string, email: string | undefined, metadataName: unknown): Promise<string> {
  const { data, error } = await createServiceClient().from("profiles").select("full_name").eq("id", userId).maybeSingle();
  if (error) console.error("[admin] staff name lookup failed", { userId, error: error.message });
  const full = (data?.full_name as string | null) ?? (typeof metadataName === "string" ? metadataName : null);
  return displayFirstName(full, email);
}

export type LastDayMetric = "signups" | "leads" | "orders" | "revenue" | "lessons" | "practice";
export type LastDay = Record<LastDayMetric, { current: number; previous: number }>;

/** The last 24 hours next to the 24 before (null when the query failed). */
export async function lastDay(currency: string): Promise<LastDay | null> {
  const { data, error } = await createServiceClient().rpc("admin_last_day", { p_currency: currency });
  if (error || !data) {
    console.error("[admin] last-day numbers failed", error?.message ?? "no rows");
    return null;
  }
  const rows = data as { metric: LastDayMetric; current_value: number; previous_value: number }[];
  return Object.fromEntries(rows.map((r) => [r.metric, { current: Number(r.current_value), previous: Number(r.previous_value) }])) as LastDay;
}

/** Newest academy events, before folding bursts (see groupActivity). */
export async function recentActivityRows(limit: number): Promise<ActivityRow[] | null> {
  const { data, error } = await createServiceClient().rpc("admin_recent_activity", { p_limit: limit });
  if (error || !data) {
    console.error("[admin] recent activity failed", error?.message ?? "no rows");
    return null;
  }
  return (data as Record<string, unknown>[]).map((r) => ({
    kind: r.kind as ActivityRow["kind"],
    at: String(r.at),
    userId: (r.user_id as string | null) ?? null,
    email: (r.email as string | null) ?? null,
    name: (r.full_name as string | null) ?? null,
    detail: (r.detail as string | null) ?? null,
    amountCents: r.amount_cents === null ? null : Number(r.amount_cents),
    currency: (r.currency as string | null) ?? null,
  }));
}

const FAILED_EMAIL_DAYS = 7;

/** What the "Needs attention" setup checks look at. */
export async function setupFacts(): Promise<SetupFacts> {
  const sb = createServiceClient();
  const since = new Date(Date.now() - FAILED_EMAIL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const [settings, failed, flows] = await Promise.all([
    loadEmailSettings(sb),
    sb.from("email_messages").select("id", { count: "exact", head: true }).eq("status", "failed").gte("sent_at", since),
    loadJobRun(sb, "flows"),
  ]);
  if (failed.error) console.error("[admin] failed-email count failed", failed.error.message);
  return {
    hasPostalAddress: hasPostalAddress(settings),
    failedEmails: failed.count ?? 0,
    flows,
    spamProtection: turnstileEnabled(),
    isProduction: process.env.VERCEL_ENV === "production",
  };
}
