import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin";
import { findReport } from "@/lib/analytics/reports";
import { BTN_SECONDARY, Card, EmptyState, PageHeader } from "@/app/admin/_components/ui";
import { AnalyticsFilters } from "@/app/admin/_components/AnalyticsFilters";
import { AreaChart, BarChart } from "@/app/admin/_components/charts";
import { analyticsContext, type AnalyticsSearchParams } from "@/app/admin/_components/analytics-context";
import { StatCard } from "@/app/admin/_components/list-kit";
import { buildReport } from "../report-data";

export const metadata = { title: "Report" };

export const dynamic = "force-dynamic";

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<AnalyticsSearchParams>;
}) {
  await requireStaff("sales");
  const { slug } = await params;
  const meta = findReport(slug);
  if (!meta) notFound();
  const query = await searchParams;
  const ctx = await analyticsContext(query);
  const data = await buildReport(slug, ctx);
  if (!data) notFound();
  const exportHref = `/admin/reports/${slug}/export?${new URLSearchParams({ ...(query as Record<string, string>), currency: ctx.currency }).toString()}`;
  const hasData = data.rows.length > 0 && (data.chart ? data.chart.points.some((p) => p.value > 0) : true);

  return (
    <div className="space-y-5">
      <PageHeader
        title={meta.name}
        description={meta.description}
        crumbs={[{ label: "Analytics", href: "/admin/analytics" }, { label: "Reports", href: "/admin/reports" }, { label: meta.name }]}
        actions={
          <a href={exportHref} className={BTN_SECONDARY}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              download
            </span>
            Export CSV
          </a>
        }
      />
      <AnalyticsFilters range={ctx.range.key} from={ctx.fromDay} to={ctx.toDay} currency={ctx.currency} currencies={ctx.currencies} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.summary.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      {data.chart && (
        <Card>{hasData ? data.chart.kind === "area" ? <AreaChart points={data.chart.points} height={220} /> : <BarChart points={data.chart.points} height={220} /> : <EmptyState title="No data to show">Try selecting a different date range</EmptyState>}</Card>
      )}

      <Card flush>
        {data.rows.length === 0 ? (
          <EmptyState title="No data to show" />
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[#efeeed] text-left text-[#6c6a69]">
                <tr>
                  {data.columns.map((c, i) => (
                    <th key={c} className={`py-3 font-medium ${i === 0 ? "px-5" : "px-3 text-right"}`}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#efeeed]">
                {data.rows.map((row, r) => (
                  <tr key={`${row[0]}-${r}`}>
                    {row.map((cell, i) => (
                      <td key={i} className={`py-2.5 ${i === 0 ? "px-5" : "px-3 text-right tabular-nums"}`}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.note && <p className="border-t border-[#efeeed] px-5 py-3 text-xs text-[#6c6a69]">{data.note}</p>}
      </Card>
    </div>
  );
}
