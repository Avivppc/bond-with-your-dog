/** Orders list filters and status pills (orders.status). Pure. */

/** Matches the admin kit's StatusPill tones. */
type PillTone = "published" | "draft" | "warning" | "danger" | "info";
export const ORDER_STATUSES = [
  { key: "all", label: "All" },
  { key: "paid", label: "Paid" },
  { key: "refunded", label: "Refunded" },
  { key: "pending", label: "Pending" },
  { key: "failed", label: "Failed" },
  { key: "canceled", label: "Canceled" },
] as const;

export type OrderStatusFilter = (typeof ORDER_STATUSES)[number]["key"];

export const ORDER_TONE: Record<string, PillTone> = {
  paid: "published",
  pending: "warning",
  refunded: "info",
  failed: "danger",
  canceled: "draft",
};

export function parseOrderStatus(raw: unknown): OrderStatusFilter {
  return ORDER_STATUSES.find((s) => s.key === raw)?.key ?? "all";
}

export function orderStatusLabel(status: string): string {
  return ORDER_STATUSES.find((s) => s.key === status)?.label ?? status;
}

/** Query string for an orders view; defaults are left out so URLs stay short. */
export function ordersHref(view: { status: OrderStatusFilter; q: string; page?: number }): string {
  const params = new URLSearchParams({
    ...(view.status !== "all" ? { status: view.status } : {}),
    ...(view.q ? { q: view.q } : {}),
    ...(view.page && view.page > 1 ? { page: String(view.page) } : {}),
  });
  const qs = params.toString();
  return qs ? `/admin/orders?${qs}` : "/admin/orders";
}
