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
    { label: "Students", value: String(totalUsers ?? "—"), hint: "accounts" },
    { label: "Active enrollments", value: String(activeEnrollments.count ?? "—"), hint: "course seats" },
    { label: "Revenue", value: revenue, hint: `last ${WINDOW_DAYS} days` },
    { label: "Orders", value: String(paidOrders.data?.length ?? 0), hint: `paid, last ${WINDOW_DAYS} days` },
    { label: "Lessons completed", value: String(completions.count ?? "—"), hint: `last ${WINDOW_DAYS} days` },
    { label: "New leads", value: String(leads.count ?? "—"), hint: `quiz, last ${WINDOW_DAYS} days` },
  ];
}

export async function StatsOverview() {
  const stats = await loadStats();
  return (
    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
      {stats.map((s) => (
        <div key={s.label} className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{s.label}</p>
          <p className="text-2xl font-extrabold tracking-tight mt-1">{s.value}</p>
          <p className="text-[11px] text-slate-400">{s.hint}</p>
        </div>
      ))}
    </section>
  );
}
