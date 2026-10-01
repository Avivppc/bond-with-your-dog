import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { canPerform } from "@/lib/staff";
import { formatMoney } from "@/lib/pricing";
import { percentChange } from "@/lib/analytics/range";
import { bucketLabel } from "@/lib/analytics/queries";
import {
  compareSeries,
  metricInfo,
  parseDashboardRange,
  parseMetric,
  seriesTotal,
  type DashboardMetric,
  type DashboardRange,
} from "@/lib/admin-helpers/dashboard-metrics";
import { analyticsContext, type AnalyticsContext } from "./_components/analytics-context";
import { StatsOverview } from "./_components/StatsOverview";
import { ComparisonChart } from "./_components/ComparisonChart";
import { DashboardControls } from "./_components/DashboardControls";
import { metricSeries, staffFirstName } from "./_components/dashboard-data";
import { BTN_PRIMARY, Card, EmptyState } from "./_components/ui";
import { CourseTable } from "./_components/CourseTable";
import { loadAdminCourses } from "./_components/course-stats";

export const dynamic = "force-dynamic";

const RECENT_COURSES = 5;

interface DashboardParams {
  range?: string;
  currency?: string;
  metric?: string;
}

function Change({ current, previous }: { current: number; previous: number }) {
  const change = percentChange(current, previous);
  if (change === null) return <span className="text-[14px] text-[#9b9997]">No previous data</span>;
  const up = change >= 0;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${up ? "bg-[#e3f5e8] text-[#1c6b35]" : "bg-[#fde8e8] text-[#a4262c]"}`}>
      {up ? "↑" : "↓"} {Math.abs(change)}% vs previous period
    </span>
  );
}

async function MetricCard({ ctx, rangeKey, metric }: { ctx: AnalyticsContext; rangeKey: DashboardRange; metric: DashboardMetric }) {
  const { range, currency } = ctx;
  const [current, previous] = await Promise.all([
    metricSeries(metric, range, range.bucket, currency),
    metricSeries(metric, range.previous, range.bucket, currency),
  ]);
  const info = metricInfo(metric);
  const format = (v: number) => (info.money ? formatMoney(v, currency) : v.toLocaleString("en-US"));
  const points = compareSeries(current, previous, metric);
  const total = seriesTotal(points, "current");
  const previousTotal = seriesTotal(points, "previous");

  return (
    <Card>
      <DashboardControls range={rangeKey} currency={currency} currencies={ctx.currencies} metric={metric} />
      <div className="mt-5">
        <p className="text-[14px] text-[#6c6a69]">
          {info.label} · {range.label}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <p className="text-[32px] font-semibold tracking-tight">{format(total)}</p>
          <Change current={total} previous={previousTotal} />
        </div>
      </div>
      <div className="mt-5">
        <ComparisonChart points={points.map((p) => ({ ...p, label: bucketLabel(p.bucket, range.bucket) }))} format={format} />
      </div>
    </Card>
  );
}

export default async function AdminDashboardPage({ searchParams }: { searchParams: Promise<DashboardParams> }) {
  const { user, role } = await requireStaff("content");
  const params = await searchParams;
  const canSell = canPerform(role, "sales");
  const rangeKey = parseDashboardRange(params.range);
  const [firstName, courses, ctx] = await Promise.all([
    staffFirstName(user.id, user.email, user.user_metadata?.full_name),
    loadAdminCourses(RECENT_COURSES),
    analyticsContext({ range: rangeKey, currency: params.currency }),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[24px] font-semibold tracking-tight">Welcome back, {firstName}.</h1>
        <Link href="/admin/courses/new" className={BTN_PRIMARY}>
          <span aria-hidden>+</span> New product
        </Link>
      </header>
      {canSell && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <MetricCard ctx={ctx} rangeKey={rangeKey} metric={parseMetric(params.metric)} />
          <StatsOverview currency={ctx.currency} to={ctx.range.to} />
        </div>
      )}
      <Card
        flush
        title="Courses"
        actions={
          <Link href="/admin/products" className="text-[14px] font-medium text-[#1a1a19] hover:underline">
            View all products
          </Link>
        }
      >
        {courses.length === 0 ? <EmptyState title="No courses yet." /> : <CourseTable courses={courses} />}
      </Card>
    </div>
  );
}
