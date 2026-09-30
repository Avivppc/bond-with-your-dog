import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const LIMIT = 200;

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  refunded: "bg-purple-100 text-purple-800",
  canceled: "bg-slate-100 text-slate-600",
  failed: "bg-red-100 text-red-700",
};

export default async function OrdersPage() {
  await requireStaff("sales");
  const sb = createServiceClient();
  const [ordersRes, usersRes, subsRes] = await Promise.all([
    sb.from("orders").select("id, user_id, status, amount_cents, currency, provider, created_at, offers(title)").order("created_at", { ascending: false }).limit(LIMIT),
    sb.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    sb.from("subscriptions").select("order_id, status, current_period_end"),
  ]);
  const emailOf = new Map((usersRes.data?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  const subOf = new Map((subsRes.data ?? []).map((s) => [s.order_id, s]));
  const orders = ordersRes.data ?? [];
  const paid = orders.filter((o) => o.status === "paid");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold tracking-tighter">Orders</h1>
        <p className="text-sm text-slate-500">
          Latest {LIMIT}. Refunds are issued in the payment provider&apos;s dashboard; access is removed automatically.
        </p>
      </header>
      <p className="text-sm">
        <b>{paid.length}</b> paid orders shown ·{" "}
        {Object.entries(
          paid.reduce<Record<string, number>>((acc, o) => ({ ...acc, [o.currency]: (acc[o.currency] ?? 0) + o.amount_cents }), {})
        )
          .map(([cur, cents]) => formatMoney(cents, cur))
          .join(" · ") || "no revenue yet"}
      </p>
      <section className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500 bg-slate-50">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th>Customer</th>
              <th>Offer</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Provider</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.map((o) => {
              const sub = subOf.get(o.id);
              return (
                <tr key={o.id}>
                  <td className="px-4 py-2.5 text-slate-500">{new Date(o.created_at).toLocaleString("en-US")}</td>
                  <td>{emailOf.get(o.user_id) ?? o.user_id}</td>
                  <td>
                    {(o.offers as unknown as { title: string } | null)?.title}
                    {sub && <span className="ms-2 text-[10px] uppercase text-slate-500">subscription · {sub.status}</span>}
                  </td>
                  <td>{o.amount_cents === 0 ? "Free" : formatMoney(o.amount_cents, o.currency)}</td>
                  <td>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${STATUS_STYLE[o.status] ?? ""}`}>{o.status}</span>
                  </td>
                  <td className="text-slate-500">{o.provider}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {orders.length === 0 && <p className="p-6 text-sm text-slate-500">No orders yet.</p>}
      </section>
    </div>
  );
}
