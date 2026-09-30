import { formatMoney } from "@/lib/pricing";
import { StatCard } from "./list-kit";
import { dashboardCounts, netRevenueAllTime } from "./dashboard-data";

const count = (n: number | undefined) => (n === undefined ? "—" : n.toLocaleString("en-US"));

/**
 * The dashboard's right-column cards. Net revenue subtracts refunds; "Active students" counts
 * members with at least one live enrollment (not every account).
 */
export async function StatsOverview({ currency, to }: { currency: string; to: Date }) {
  const [counts, net] = await Promise.all([dashboardCounts(), netRevenueAllTime(currency, to)]);
  return (
    <section className="grid gap-3" aria-label="Key numbers">
      <StatCard label="Net revenue" hint={`All-time · ${currency} · after refunds`} value={formatMoney(net, currency)} href="/admin/analytics" />
      <StatCard label="Active students" hint="With a live course enrollment" value={count(counts?.activeStudents)} href="/admin/people?segment=students" />
      <StatCard label="Videos waiting for Roni" hint="Open Roni's Studio" value={count(counts?.videosWaiting)} href="/studio" />
      <StatCard label="Open inbox items" hint="Questions, problems and stories" value={count(counts?.openInbox)} href="/admin/inbox" />
    </section>
  );
}
