import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatMoney } from "@/lib/pricing";

export const dynamic = "force-dynamic";

const LIMIT = 200;

const STATUS_STYLE: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  refunded: "bg-purple-100 text-purple-800",
  canceled: "bg-[#f3f3f2] text-[#6c6a69]",
  failed: "bg-red-100 text-red-700",
};

export default async function OrdersPage() {
  await requireStaff("sales");
  const sb = createServiceClient();
  const ordersRes = await sb
    .from("orders")
    .select("id, user_id, status, amount_cents, currency, provider, created_at, offers(title)")
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  if (ordersRes.error) console.error("[orders] list failed", ordersRes.error.message);
  const orders = ordersRes.data ?? [];
  const orderIds = orders.map((o) => o.id);
  const userIds = [...new Set(orders.map((o) => o.user_id))];

  const [emailsRes, subsRes] = await Promise.all([
    userIds.length ? sb.rpc("admin_user_emails", { p_user_ids: userIds }) : Promise.resolve({ data: [], error: null }),
    orderIds.length
      ? sb.from("subscriptions").select("order_id, status, current_period_end").in("order_id", orderIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (emailsRes.error) console.error("[orders] email lookup failed", emailsRes.error.message);
  const emailOf = new Map(((emailsRes.data ?? []) as { user_id: string; email: string }[]).map((u) => [u.user_id, u.email]));
  const subOf = new Map((subsRes.data ?? []).map((s) => [s.order_id, s]));
  const paid = orders.filter((o) => o.status === "paid");

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-sm text-[#6c6a69]">
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
      <section className="bg-white rounded-[12px] border border-[#e7e6e4] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-sm text-[#6c6a69] border-b border-[#efeeed]">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th>Customer</th>
              <th>Offer</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Provider</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#efeeed]">
            {orders.map((o) => {
              const sub = subOf.get(o.id);
              return (
                <tr key={o.id}>
                  <td className="px-4 py-2.5 text-[#6c6a69]">{new Date(o.created_at).toLocaleString("en-US")}</td>
                  <td>{emailOf.get(o.user_id) ?? o.user_id}</td>
                  <td>
                    {(o.offers as unknown as { title: string } | null)?.title}
                    {sub && <span className="ms-2 text-xs text-[#6c6a69]">subscription · {sub.status}</span>}
                  </td>
                  <td>{o.amount_cents === 0 ? "Free" : formatMoney(o.amount_cents, o.currency)}</td>
                  <td>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_STYLE[o.status] ?? ""}`}>{o.status}</span>
                  </td>
                  <td className="text-[#6c6a69]">{o.provider}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {orders.length === 0 && <p className="p-6 text-sm text-[#6c6a69]">No orders yet.</p>}
      </section>
    </div>
  );
}
