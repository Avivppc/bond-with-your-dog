import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import * as q from "@/lib/analytics/queries";
import type { Bucket } from "@/lib/analytics/range";
import type { DashboardMetric, MetricBucket } from "@/lib/admin-helpers/dashboard-metrics";
import { displayFirstName } from "@/lib/admin-helpers/display";

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
