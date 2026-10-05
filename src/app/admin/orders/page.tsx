import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { formatMoney } from "@/lib/pricing";
import { pageWindow, parsePage } from "@/lib/admin-helpers/pagination";
import { parseSearch } from "@/lib/admin-helpers/search";
import { capitalizeFirst } from "@/lib/admin-helpers/display";
import { ORDER_STATUSES, ORDER_TONE, orderStatusLabel, ordersHref, parseOrderStatus, type OrderStatusFilter } from "@/lib/admin-helpers/orders";
import { LocalTime } from "@/components/ui/LocalTime";
import { Card, EmptyState, INPUT, PageHeader, StatusPill, TABLE, TD, TH, THEAD, TROW } from "../_components/ui";
import { Pagination } from "../_components/list-kit";
import { loadOrders, ORDERS_PER_PAGE, type OrderRow } from "./orders-data";

export const metadata = { title: "Orders" };

export const dynamic = "force-dynamic";

function OrderTableRow({ order }: { order: OrderRow }) {
  return (
    <tr className={TROW}>
      <td className={TD}>
        <Link href={`/admin/people/${order.userId}`} className="block min-w-0 hover:underline">
          <span className="block truncate font-medium">{order.name || order.email || "Deleted account"}</span>
          {order.name && order.email && <span className="block truncate text-[12px] text-[#6c6a69]">{order.email}</span>}
        </Link>
      </td>
      <td className={TD}>
        <Link href={`/admin/offers/${order.offerId}`} className="hover:underline">
          {order.offer ?? "—"}
        </Link>
        {order.subscription && <span className="block text-[12px] text-[#6c6a69]">Subscription · {order.subscription.status.replace(/_/g, " ")}</span>}
      </td>
      <td className={`${TD} whitespace-nowrap tabular-nums`}>{order.amountCents === 0 ? "Free" : formatMoney(order.amountCents, order.currency)}</td>
      <td className={TD}>
        <StatusPill tone={ORDER_TONE[order.status] ?? "draft"}>{orderStatusLabel(order.status)}</StatusPill>
      </td>
      <td className={`${TD} text-[#6c6a69]`}>{capitalizeFirst(order.provider)}</td>
      <td className={`${TD} whitespace-nowrap text-[#6c6a69]`}>
        <LocalTime iso={order.createdAt} format="dateTime" />
      </td>
    </tr>
  );
}

function StatusFilter({ status, q }: { status: OrderStatusFilter; q: string }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Status">
      {ORDER_STATUSES.map((s) => (
        <Link
          key={s.key}
          href={ordersHref({ status: s.key, q })}
          aria-current={s.key === status ? "true" : undefined}
          className={`rounded-full border px-3 py-1 text-[14px] ${s.key === status ? "border-[#343332] bg-[#343332] text-white" : "border-[#d9d8d6] bg-white hover:bg-[#f3f3f2]"}`}
        >
          {s.label}
        </Link>
      ))}
    </div>
  );
}

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  await requireStaff("sales");
  const params = await searchParams;
  const status = parseOrderStatus(params.status);
  const q = parseSearch(params.q);
  const requested = parsePage(params.page);
  const first = await loadOrders(status, q, requested);
  // Past the last page (e.g. after a filter narrowed the list): show the last real page.
  const win = pageWindow(first.total, requested, ORDERS_PER_PAGE);
  const result = win.page === requested || first.failed ? first : await loadOrders(status, q, win.page);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Orders"
        description="Every checkout, newest first. Refunds are issued in Paddle; access is removed automatically when one comes in."
      />
      <Card flush>
        <div className="-mt-1 flex flex-wrap items-center gap-3 px-5 pt-4">
          <form role="search" className="min-w-56 flex-1 sm:max-w-sm">
            {status !== "all" && <input type="hidden" name="status" value={status} />}
            <label className="relative block">
              <span className="sr-only">Search orders by customer</span>
              <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[#9b9997]" aria-hidden>
                search
              </span>
              <input name="q" type="search" defaultValue={q} placeholder="Search by customer name or email" className={`${INPUT} pl-9`} />
            </label>
          </form>
          <StatusFilter status={status} q={q} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-[14px] text-[#6c6a69]">
          <span>
            Displaying {win.first}–{win.last} of <b className="text-[#1a1a19]">{result.total.toLocaleString("en-US")}</b> orders
          </span>
          <Pagination page={win.page} pages={win.pages} hrefFor={(page) => ordersHref({ status, q, page })} />
        </div>
        {result.failed ? (
          <EmptyState title="Orders couldn't be loaded.">Please refresh the page.</EmptyState>
        ) : result.rows.length === 0 ? (
          <EmptyState title={q || status !== "all" ? "No orders match these filters." : "No orders yet."} />
        ) : (
          <div className="relative overflow-x-auto">
            <table className={TABLE}>
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Customer</th>
                  <th className={TH}>Offer</th>
                  <th className={TH}>Amount</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Provider</th>
                  <th className={TH}>Date</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((o) => (
                  <OrderTableRow key={o.id} order={o} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
