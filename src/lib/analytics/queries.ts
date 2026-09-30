import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import type { Bucket } from "./range";

/**
 * Typed wrappers around the admin_* analytics functions (supabase/migrations/…_analytics.sql).
 * Service role only — callers must have checked requireStaff("sales").
 */
type Window = { from: Date; to: Date };

export interface RevenueTotals {
  gross: number;
  refunds: number;
  charges: number;
  refundCount: number;
  payingCustomers: number;
  freePurchases: number;
}

export interface RevenuePoint {
  bucket: string;
  gross: number;
  refunds: number;
  charges: number;
  refundCount: number;
}

const iso = (d: Date) => d.toISOString();

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T[]> {
  const { data, error } = await createServiceClient().rpc(fn, args);
  if (error) {
    console.error(`[analytics] ${fn} failed`, error.message);
    return [];
  }
  return (data ?? []) as T[];
}

export async function currencies(): Promise<string[]> {
  const rows = await rpc<{ currency: string }>("admin_currencies", {});
  return rows.map((r) => r.currency);
}

export async function revenueTotals(w: Window, currency: string): Promise<RevenueTotals> {
  const [row] = await rpc<Record<string, number>>("admin_revenue_totals", { p_from: iso(w.from), p_to: iso(w.to), p_currency: currency });
  return {
    gross: Number(row?.gross_cents ?? 0),
    refunds: Number(row?.refund_cents ?? 0),
    charges: Number(row?.charges ?? 0),
    refundCount: Number(row?.refunds ?? 0),
    payingCustomers: Number(row?.paying_customers ?? 0),
    freePurchases: Number(row?.free_purchases ?? 0),
  };
}

export async function revenueSeries(w: Window, bucket: Bucket, currency: string): Promise<RevenuePoint[]> {
  const rows = await rpc<Record<string, string | number>>("admin_revenue_series", {
    p_from: iso(w.from),
    p_to: iso(w.to),
    p_bucket: bucket,
    p_currency: currency,
  });
  return rows.map((r) => ({
    bucket: String(r.bucket),
    gross: Number(r.gross_cents),
    refunds: Number(r.refund_cents),
    charges: Number(r.charges),
    refundCount: Number(r.refunds),
  }));
}

export async function topOffers(w: Window, currency: string, limit = 5) {
  const rows = await rpc<Record<string, string | number>>("admin_top_offers", { p_from: iso(w.from), p_to: iso(w.to), p_currency: currency, p_limit: limit });
  return rows.map((r) => ({
    offerId: String(r.offer_id),
    title: String(r.title),
    gross: Number(r.gross_cents),
    refunds: Number(r.refund_cents),
    purchases: Number(r.purchases),
  }));
}

export async function revenueByMethod(w: Window, currency: string) {
  const rows = await rpc<Record<string, string | number>>("admin_revenue_by_method", { p_from: iso(w.from), p_to: iso(w.to), p_currency: currency });
  return rows.map((r) => ({ method: String(r.method), gross: Number(r.gross_cents), payments: Number(r.payments) }));
}

export async function topCustomers(w: Window, currency: string, limit = 5) {
  const rows = await rpc<Record<string, string | number>>("admin_top_customers", { p_from: iso(w.from), p_to: iso(w.to), p_currency: currency, p_limit: limit });
  return rows.map((r) => ({
    userId: String(r.user_id),
    email: String(r.email),
    gross: Number(r.gross_cents),
    refunds: Number(r.refund_cents),
    net: Number(r.net_cents),
    payments: Number(r.payments),
  }));
}

export async function offerPurchasesSeries(w: Window, bucket: Bucket, currency: string) {
  const rows = await rpc<Record<string, string | number>>("admin_offer_purchases_series", {
    p_from: iso(w.from),
    p_to: iso(w.to),
    p_bucket: bucket,
    p_currency: currency,
  });
  return rows.map((r) => ({ bucket: String(r.bucket), paid: Number(r.paid_purchases), free: Number(r.free_purchases), gross: Number(r.gross_cents) }));
}

export async function contactsSeries(w: Window, bucket: Bucket) {
  const rows = await rpc<Record<string, string | number>>("admin_contacts_series", { p_from: iso(w.from), p_to: iso(w.to), p_bucket: bucket });
  return rows.map((r) => ({ bucket: String(r.bucket), signups: Number(r.signups), leads: Number(r.leads) }));
}

export async function subscriptionStatus() {
  const rows = await rpc<Record<string, string | number>>("admin_subscription_status", {});
  return new Map(rows.map((r) => [String(r.status), Number(r.subscriptions)]));
}

export async function subscriptionsSeries(w: Window, bucket: Bucket) {
  const rows = await rpc<Record<string, string | number>>("admin_subscriptions_series", { p_from: iso(w.from), p_to: iso(w.to), p_bucket: bucket });
  return rows.map((r) => ({ bucket: String(r.bucket), started: Number(r.started), canceled: Number(r.canceled) }));
}

export async function churn(w: Window) {
  const [row] = await rpc<Record<string, string | number>>("admin_churn", { p_from: iso(w.from), p_to: iso(w.to) });
  return { activeAtStart: Number(row?.active_at_start ?? 0), canceled: Number(row?.canceled ?? 0), rate: Number(row?.rate ?? 0) };
}

export async function subscriptionRetention(w: Window, months: number) {
  const rows = await rpc<{ cohort: string; subscribers: number; retained: number[] }>("admin_subscription_retention", {
    p_from: iso(w.from),
    p_to: iso(w.to),
    p_months: months,
  });
  return rows.map((r) => ({ cohort: String(r.cohort), subscribers: Number(r.subscribers), retained: (r.retained ?? []).map(Number) }));
}

export async function completionsSeries(w: Window, bucket: Bucket) {
  const rows = await rpc<Record<string, string | number>>("admin_completions_series", { p_from: iso(w.from), p_to: iso(w.to), p_bucket: bucket });
  return rows.map((r) => ({ bucket: String(r.bucket), completions: Number(r.completions), learners: Number(r.learners) }));
}

export async function courseProgressReport() {
  const rows = await rpc<Record<string, string | number>>("admin_course_progress", {});
  return rows.map((r) => ({
    courseId: String(r.course_id),
    title: String(r.title),
    activeStudents: Number(r.active_students),
    started: Number(r.started),
    finished: Number(r.finished),
    avgPercent: Number(r.avg_percent),
  }));
}

/** "Oct 3" for days/weeks, "Oct 2026" for months (UTC, like the SQL buckets). */
export function bucketLabel(bucketIso: string, bucket: Bucket): string {
  const d = new Date(bucketIso);
  return bucket === "month"
    ? d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
