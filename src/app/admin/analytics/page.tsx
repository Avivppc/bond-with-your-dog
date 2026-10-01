import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { formatMoney } from "@/lib/pricing";
import { percentChange } from "@/lib/analytics/range";
import * as q from "@/lib/analytics/queries";
import { PageHeader } from "@/app/admin/_components/ui";
import { AnalyticsFilters } from "@/app/admin/_components/AnalyticsFilters";
import { AreaChart, BarList, Donut } from "@/app/admin/_components/charts";
import { analyticsContext, type AnalyticsSearchParams } from "@/app/admin/_components/analytics-context";

export const dynamic = "force-dynamic";

const RETENTION_MONTHS = 4;
const SUBSCRIPTION_STATES = [
  { key: "active", label: "Active", color: "#3fae8a" },
  { key: "trialing", label: "Trialing", color: "#4f6bed" },
  { key: "past_due", label: "Past due", color: "#e0607e" },
  { key: "pending_cancellation", label: "Pending cancellation", color: "#f28b54" },
  { key: "paused", label: "Paused", color: "#b565d8" },
] as const;

function Delta({ current, previous }: { current: number; previous: number }) {
  const change = percentChange(current, previous);
  if (change === null) return <span className="text-sm text-[#9b9997]">--</span>;
  const up = change >= 0;
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${up ? "bg-[#e3f5e8] text-[#1c6b35]" : "bg-[#fde8e8] text-[#a4262c]"}`}>
      {up ? "↑" : "↓"} {Math.abs(change)}%
    </span>
  );
}

function Tile({ title, report, children }: { title: string; report?: string; children: React.ReactNode }) {
  return (
    <section className="flex min-h-64 flex-col rounded-[12px] border border-[#e7e6e4] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <h2 className="mb-3 text-sm font-medium">
        {report ? (
          <Link href={report} className="underline decoration-dotted underline-offset-4 hover:decoration-solid">
            {title}
          </Link>
        ) : (
          title
        )}
      </h2>
      <div className="flex flex-1 flex-col">{children}</div>
    </section>
  );
}

function NoData() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
      <p className="font-medium">No data to show</p>
      <p className="text-xs text-[#6c6a69]">Try selecting a different date range</p>
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<AnalyticsSearchParams> }) {
  await requireStaff("sales");
  const params = await searchParams;
  const ctx = await analyticsContext(params);
  const { range, currency } = ctx;
  const money = (cents: number) => formatMoney(cents, currency);
  const reportHref = (slug: string) => `/admin/reports/${slug}?${new URLSearchParams(params as Record<string, string>).toString()}`;
  const retentionWindow = { from: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - RETENTION_MONTHS, 1)), to: range.to };

  const [totals, previous, series, offers, methods, customers, contacts, prevContacts, statuses, retention, churn, prevChurn, completions, prevCompletions] =
    await Promise.all([
      q.revenueTotals(range, currency),
      q.revenueTotals(range.previous, currency),
      q.revenueSeries(range, range.bucket, currency),
      q.topOffers(range, currency, 5),
      q.revenueByMethod(range, currency),
      q.topCustomers(range, currency, 5),
      q.contactsSeries(range, range.bucket),
      q.contactsSeries(range.previous, range.bucket),
      q.subscriptionStatus(),
      q.subscriptionRetention(retentionWindow, RETENTION_MONTHS),
      q.churn(range),
      q.churn(range.previous),
      q.completionsSeries(range, range.bucket),
      q.completionsSeries(range.previous, range.bucket),
    ]);

  const label = (b: string) => q.bucketLabel(b, range.bucket);
  const contactTotal = contacts.reduce((s, p) => s + p.signups + p.leads, 0);
  const prevContactTotal = prevContacts.reduce((s, p) => s + p.signups + p.leads, 0);
  const completionTotal = completions.reduce((s, p) => s + p.completions, 0);
  const prevCompletionTotal = prevCompletions.reduce((s, p) => s + p.completions, 0);
  const net = totals.gross - totals.refunds;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        actions={
          <Link href="/admin/reports" className="inline-flex items-center gap-1.5 rounded-full border border-[#d9d8d6] bg-white px-3 py-1.5 text-sm font-medium hover:bg-[#f3f3f2]">
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              description
            </span>
            All reports
          </Link>
        }
      />
      <AnalyticsFilters range={range.key} from={ctx.fromDay} to={ctx.toDay} currency={currency} currencies={ctx.currencies} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Tile title="Gross revenue" report={reportHref("gross-revenue")}>
          <p className="flex items-center gap-2 text-2xl font-semibold">
            {money(totals.gross)} <Delta current={totals.gross} previous={previous.gross} />
          </p>
          {totals.gross > 0 ? (
            <div className="mt-auto pt-4">
              <AreaChart points={series.map((p) => ({ label: label(p.bucket), value: p.gross, title: `${label(p.bucket)}: ${money(p.gross)}` }))} />
            </div>
          ) : (
            <NoData />
          )}
        </Tile>

        <Tile title="Top offers" report={reportHref("payments-by-offer")}>
          {offers.length ? (
            <BarList items={offers.map((o) => ({ label: o.title, value: o.gross, display: money(o.gross), href: `/admin/offers/${o.offerId}` }))} />
          ) : (
            <NoData />
          )}
        </Tile>

        <Tile title="Gross revenue by payment method" report={reportHref("payments-by-method")}>
          {methods.length ? (
            <Donut
              centerLabel="Total"
              centerValue={money(methods.reduce((s, m) => s + m.gross, 0))}
              slices={methods.map((m) => ({ label: m.method, value: m.gross, display: money(m.gross) }))}
            />
          ) : (
            <NoData />
          )}
        </Tile>

        <Tile title="Top customers" report={reportHref("top-customers")}>
          {customers.length ? <BarList color="#f28b54" items={customers.map((c) => ({ label: c.email, value: c.net, display: money(c.net), href: `/admin/people/${c.userId}` }))} /> : <NoData />}
        </Tile>

        <Tile title="New contacts" report={reportHref("new-contacts")}>
          <p className="flex items-center gap-2 text-2xl font-semibold">
            {contactTotal} <Delta current={contactTotal} previous={prevContactTotal} />
          </p>
          {contactTotal > 0 ? (
            <div className="mt-auto pt-4">
              <AreaChart color="#3fae8a" points={contacts.map((p) => ({ label: label(p.bucket), value: p.signups + p.leads }))} />
            </div>
          ) : (
            <NoData />
          )}
        </Tile>

        <Tile title="Subscription status">
          <p className="-mt-1 mb-2 text-right text-xs text-[#6c6a69]">Current</p>
          <ul className="divide-y divide-[#efeeed] text-sm">
            {SUBSCRIPTION_STATES.map((s) => (
              <li key={s.key} className="flex items-center justify-between py-2.5">
                <span className="flex items-center gap-2 font-medium">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
                <span className="tabular-nums">{statuses.get(s.key) ?? 0}</span>
              </li>
            ))}
          </ul>
        </Tile>

        <Tile title="Subscription retention" report={reportHref("subscription-retention")}>
          {retention.length ? (
            <div className="relative overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="text-left text-[#6c6a69]">
                  <tr>
                    <th className="py-1.5 pr-2 font-medium">Month</th>
                    <th className="py-1.5 pr-2 font-medium">Subs</th>
                    {Array.from({ length: RETENTION_MONTHS }, (_, i) => (
                      <th key={i} className="py-1.5 pr-2 font-medium">
                        PMT {i + 1}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efeeed]">
                  {retention.map((c) => (
                    <tr key={c.cohort}>
                      <td className="py-1.5 pr-2 text-[#6c6a69]">{q.bucketLabel(c.cohort, "month")}</td>
                      <td className="py-1.5 pr-2">{c.subscribers}</td>
                      {c.retained.map((kept, i) => {
                        const start = new Date(c.cohort);
                        const future = Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i + 1, 1) > Date.now();
                        return (
                          <td key={i} className="py-1.5 pr-2 tabular-nums">
                            {future ? "—" : `${c.subscribers ? Math.round((kept / c.subscribers) * 100) : 0}%`}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <NoData />
          )}
        </Tile>

        <Tile title="Churn rate" report={reportHref("subscription-cancellations")}>
          <p className="flex items-center gap-2 text-2xl font-semibold">
            {(churn.rate * 100).toFixed(1)}% <Delta current={churn.rate} previous={prevChurn.rate} />
          </p>
          <p className="mt-1 text-sm text-[#6c6a69]">
            {churn.canceled} canceled of {churn.activeAtStart} active at the start of the period
          </p>
          {churn.activeAtStart === 0 && <NoData />}
        </Tile>

        <Tile title="Net revenue" report={reportHref("net-revenue")}>
          <p className="flex items-center gap-2 text-2xl font-semibold">
            {money(net)} <Delta current={net} previous={previous.gross - previous.refunds} />
          </p>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-[#6c6a69]">Refunds</dt>
              <dd>
                {money(totals.refunds)} ({totals.refundCount})
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6c6a69]">Paying customers</dt>
              <dd>{totals.payingCustomers}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[#6c6a69]">Free offers claimed</dt>
              <dd>{totals.freePurchases}</dd>
            </div>
          </dl>
        </Tile>

        <Tile title="Lessons completed" report={reportHref("lesson-completions")}>
          <p className="flex items-center gap-2 text-2xl font-semibold">
            {completionTotal} <Delta current={completionTotal} previous={prevCompletionTotal} />
          </p>
          {completionTotal > 0 ? (
            <div className="mt-auto pt-4">
              <AreaChart color="#b565d8" points={completions.map((p) => ({ label: label(p.bucket), value: p.completions }))} />
            </div>
          ) : (
            <NoData />
          )}
        </Tile>
      </div>
    </div>
  );
}
