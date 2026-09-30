import { createServiceClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/pricing";

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30;

interface Stat {
  label: string;
  value: string;
  hint: string;
}

async function loadStats(): Promise<Stat[]> {
  const sb = createServiceClient();
  const since = new Date(Date.now() - WINDOW_DAYS * DAY_MS).toISOString();
  const nowIso = new Date().toISOString();

  // Each card is an independent query so one failure doesn't blank the dashboard.
  const [users, activeEnrollments, paidOrders, leads, completions] = await Promise.all([
    sb.auth.admin.listUsers({ page: 1, perPage: 1 }),
    sb.from("enrollments").select("user_id", { count: "exact", head: true }).or(`expires_at.is.null,expires_at.gt.${nowIso}`),
    sb.from("orders").select("amount_cents, currency").eq("status", "paid").gte("paid_at", since),
    sb.from("quiz_leads").select("id", { count: "exact", head: true }).gte("created_at", since),
    sb.from("events").select("id", { count: "exact", head: true }).eq("type", "lesson.completed").gte("created_at", since),
  ]);

  const revenueByCurrency = (paidOrders.data ?? []).reduce<Record<string, number>>(
    (acc, o) => ({ ...acc, [o.currency]: (acc[o.currency] ?? 0) + o.amount_cents }),
    {}
  );
  const revenue = Object.entries(revenueByCurrency).map(([cur, cents]) => formatMoney(cents, cur)).join(" + ") || "$0";
  const totalUsers = (users.data as unknown as { total?: number } | null)?.total;

  return [
    { label: "Net revenue", value: revenue, hint: `Last ${WINDOW_DAYS} days` },
    { label: "Orders", value: String(paidOrders.data?.length ?? 0), hint: `Paid, last ${WINDOW_DAYS} days` },
    { label: "Students", value: String(totalUsers ?? "—"), hint: "Accounts" },
    { label: "Active enrollments", value: String(activeEnrollments.count ?? "—"), hint: "Course seats" },
    { label: "Lessons completed", value: String(completions.count ?? "—"), hint: `Last ${WINDOW_DAYS} days` },
    { label: "New leads", value: String(leads.count ?? "—"), hint: `Quiz, last ${WINDOW_DAYS} days` },
  ];
}

export async function StatsOverview() {
  const stats = await loadStats();
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3" aria-label="Key numbers">
      {stats.map((s) => (
        <div key={s.label} className="rounded-[12px] border border-[#e7e6e4] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-sm text-[#6c6a69]">{s.label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-[#1a1a19]">{s.value}</p>
          <p className="mt-0.5 text-xs text-[#9b9997]">{s.hint}</p>
        </div>
      ))}
    </section>
  );
}
