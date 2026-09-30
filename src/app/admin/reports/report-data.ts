import "server-only";
import { formatMoney } from "@/lib/pricing";
import type { ChartPoint } from "@/app/admin/_components/charts";
import type { AnalyticsContext } from "@/app/admin/_components/analytics-context";
import * as q from "@/lib/analytics/queries";

export interface ReportData {
  summary: { label: string; value: string }[];
  chart: { kind: "area" | "bar"; points: ChartPoint[] } | null;
  columns: string[];
  rows: string[][];
  note?: string;
}

const RETENTION_MONTHS = 6;

/** Builds one report for the page and its CSV export (same rows). */
export async function buildReport(slug: string, ctx: AnalyticsContext): Promise<ReportData | null> {
  const { range, currency } = ctx;
  const money = (cents: number) => formatMoney(cents, currency);
  const label = (b: string) => q.bucketLabel(b, range.bucket);

  switch (slug) {
    case "gross-revenue":
    case "refunds":
    case "net-revenue": {
      const [series, totals] = await Promise.all([q.revenueSeries(range, range.bucket, currency), q.revenueTotals(range, currency)]);
      const valueOf = (p: q.RevenuePoint) => (slug === "gross-revenue" ? p.gross : slug === "refunds" ? p.refunds : p.gross - p.refunds);
      const total = slug === "gross-revenue" ? totals.gross : slug === "refunds" ? totals.refunds : totals.gross - totals.refunds;
      return {
        summary: [
          { label: slug === "refunds" ? "Refunded" : slug === "net-revenue" ? "Net revenue" : "Gross revenue", value: money(total) },
          slug === "refunds" ? { label: "Refunds", value: String(totals.refundCount) } : { label: "Payments", value: String(totals.charges) },
        ],
        chart: { kind: "area", points: series.map((p) => ({ label: label(p.bucket), value: valueOf(p), title: `${label(p.bucket)}: ${money(valueOf(p))}` })) },
        columns: ["Period", "Gross", "Refunds", "Net", "Payments"],
        rows: series.map((p) => [label(p.bucket), money(p.gross), money(p.refunds), money(p.gross - p.refunds), String(p.charges)]),
      };
    }

    case "payments-by-method": {
      const rows = await q.revenueByMethod(range, currency);
      const total = rows.reduce((s, r) => s + r.gross, 0);
      return {
        summary: [{ label: "Gross revenue", value: money(total) }],
        chart: { kind: "bar", points: rows.map((r) => ({ label: r.method, value: r.gross, title: `${r.method}: ${money(r.gross)}` })) },
        columns: ["Payment method", "Gross", "Payments", "Share"],
        rows: rows.map((r) => [r.method.replace(/_/g, " "), money(r.gross), String(r.payments), total ? `${Math.round((r.gross / total) * 100)}%` : "0%"]),
      };
    }

    case "payments-by-offer": {
      const rows = await q.topOffers(range, currency, 100);
      return {
        summary: [{ label: "Offers with sales", value: String(rows.length) }],
        chart: { kind: "bar", points: rows.map((r) => ({ label: r.title, value: r.gross, title: `${r.title}: ${money(r.gross)}` })) },
        columns: ["Offer", "Gross", "Refunds", "Net", "Purchases"],
        rows: rows.map((r) => [r.title, money(r.gross), money(r.refunds), money(r.gross - r.refunds), String(r.purchases)]),
      };
    }

    case "offer-purchases":
    case "free-offers": {
      const series = await q.offerPurchasesSeries(range, range.bucket, currency);
      const free = slug === "free-offers";
      return {
        summary: [
          { label: free ? "Free offers claimed" : "Paid purchases", value: String(series.reduce((s, p) => s + (free ? p.free : p.paid), 0)) },
          ...(free ? [] : [{ label: "Revenue", value: money(series.reduce((s, p) => s + p.gross, 0)) }]),
        ],
        chart: { kind: "bar", points: series.map((p) => ({ label: label(p.bucket), value: free ? p.free : p.paid })) },
        columns: free ? ["Period", "Free offers claimed"] : ["Period", "Paid purchases", "Revenue"],
        rows: series.map((p) => (free ? [label(p.bucket), String(p.free)] : [label(p.bucket), String(p.paid), money(p.gross)])),
      };
    }

    case "new-subscriptions":
    case "subscription-cancellations": {
      const series = await q.subscriptionsSeries(range, range.bucket);
      const started = slug === "new-subscriptions";
      const valueOf = (p: { started: number; canceled: number }) => (started ? p.started : p.canceled);
      return {
        summary: [{ label: started ? "New subscriptions" : "Cancellations", value: String(series.reduce((s, p) => s + valueOf(p), 0)) }],
        chart: { kind: "bar", points: series.map((p) => ({ label: label(p.bucket), value: valueOf(p) })) },
        columns: ["Period", "Started", "Canceled"],
        rows: series.map((p) => [label(p.bucket), String(p.started), String(p.canceled)]),
      };
    }

    case "subscription-retention": {
      const cohorts = await q.subscriptionRetention(range, RETENTION_MONTHS);
      const now = Date.now();
      return {
        summary: [{ label: "Cohorts", value: String(cohorts.length) }],
        chart: null,
        columns: ["Cohort", "Subscribers", ...Array.from({ length: RETENTION_MONTHS }, (_, i) => `Month ${i + 1}`)],
        rows: cohorts.map((c) => {
          const start = new Date(c.cohort);
          return [
            q.bucketLabel(c.cohort, "month"),
            String(c.subscribers),
            ...c.retained.map((kept, i) => {
              const at = Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i + 1, 1);
              return at > now ? "—" : `${c.subscribers ? Math.round((kept / c.subscribers) * 100) : 0}%`;
            }),
          ];
        }),
        note: "Share of each month's new subscribers still subscribed at the start of each later month.",
      };
    }

    case "new-contacts": {
      const series = await q.contactsSeries(range, range.bucket);
      return {
        summary: [
          { label: "New accounts", value: String(series.reduce((s, p) => s + p.signups, 0)) },
          { label: "Quiz leads", value: String(series.reduce((s, p) => s + p.leads, 0)) },
        ],
        chart: { kind: "area", points: series.map((p) => ({ label: label(p.bucket), value: p.signups + p.leads })) },
        columns: ["Period", "New accounts", "Quiz leads"],
        rows: series.map((p) => [label(p.bucket), String(p.signups), String(p.leads)]),
      };
    }

    case "top-customers": {
      const rows = await q.topCustomers(range, currency, 100);
      return {
        summary: [{ label: "Paying customers", value: String(rows.length) }],
        chart: null,
        columns: ["Customer", "Net spend", "Gross", "Refunds", "Payments"],
        rows: rows.map((r) => [r.email, money(r.net), money(r.gross), money(r.refunds), String(r.payments)]),
      };
    }

    case "lesson-completions": {
      const series = await q.completionsSeries(range, range.bucket);
      return {
        summary: [{ label: "Lessons completed", value: String(series.reduce((s, p) => s + p.completions, 0)) }],
        chart: { kind: "bar", points: series.map((p) => ({ label: label(p.bucket), value: p.completions })) },
        columns: ["Period", "Lessons completed", "Active learners"],
        rows: series.map((p) => [label(p.bucket), String(p.completions), String(p.learners)]),
      };
    }

    case "course-progress": {
      const rows = await q.courseProgressReport();
      return {
        summary: [{ label: "Active students", value: String(rows.reduce((s, r) => s + r.activeStudents, 0)) }],
        chart: { kind: "bar", points: rows.map((r) => ({ label: r.title, value: r.avgPercent, title: `${r.title}: ${r.avgPercent}% average progress` })) },
        columns: ["Course", "Active students", "Started", "Finished", "Average progress"],
        rows: rows.map((r) => [r.title, String(r.activeStudents), String(r.started), String(r.finished), `${r.avgPercent}%`]),
        note: "Current snapshot — not affected by the date range.",
      };
    }

    default:
      return null;
  }
}
