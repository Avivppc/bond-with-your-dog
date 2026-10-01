import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import type { OrderStatusFilter } from "@/lib/admin-helpers/orders";

export const ORDERS_PER_PAGE = 25;
/** admin_list_people returns at most this many matches for a search. */
const MAX_SEARCH_MATCHES = 200;
const RANGE_NOT_SATISFIABLE = "PGRST103";

export interface OrderRow {
  id: string;
  userId: string;
  email: string | null;
  name: string | null;
  offerId: string;
  offer: string | null;
  status: string;
  amountCents: number;
  currency: string;
  provider: string;
  createdAt: string;
  subscription: { status: string; currentPeriodEnd: string | null } | null;
}

export interface OrdersPage {
  rows: OrderRow[];
  total: number;
  failed: boolean;
}

type Supabase = ReturnType<typeof createServiceClient>;

/** Contacts whose name or email matches the search (null when the lookup failed). */
async function matchingUserIds(sb: Supabase, search: string): Promise<string[] | null> {
  const { data, error } = await sb.rpc("admin_list_people", { p_search: search, p_filter: "all", p_limit: MAX_SEARCH_MATCHES, p_offset: 0 });
  if (error) {
    console.error("[orders] contact search failed", { search, error: error.message });
    return null;
  }
  return ((data ?? []) as { user_id: string }[]).map((r) => r.user_id);
}

async function contactsById(sb: Supabase, userIds: string[]): Promise<Map<string, { email: string; name: string | null }>> {
  if (userIds.length === 0) return new Map();
  const [emails, profiles] = await Promise.all([
    sb.rpc("admin_user_emails", { p_user_ids: userIds }),
    sb.from("profiles").select("id, full_name").in("id", userIds),
  ]);
  if (emails.error) console.error("[orders] email lookup failed", emails.error.message);
  if (profiles.error) console.error("[orders] profile lookup failed", profiles.error.message);
  const nameOf = new Map((profiles.data ?? []).map((p) => [p.id as string, (p.full_name as string | null) ?? null]));
  return new Map(((emails.data ?? []) as { user_id: string; email: string }[]).map((u) => [u.user_id, { email: u.email, name: nameOf.get(u.user_id) ?? null }]));
}

/** One page of orders, newest first, filtered by status and by contact name/email. */
export async function loadOrders(status: OrderStatusFilter, search: string, page: number): Promise<OrdersPage> {
  const sb = createServiceClient();
  const userIds = search ? await matchingUserIds(sb, search) : null;
  if (search && userIds === null) return { rows: [], total: 0, failed: true };
  if (userIds && userIds.length === 0) return { rows: [], total: 0, failed: false };

  const offset = (page - 1) * ORDERS_PER_PAGE;
  let query = sb
    .from("orders")
    .select("id, user_id, offer_id, status, amount_cents, currency, provider, created_at, offers(title)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + ORDERS_PER_PAGE - 1);
  if (status !== "all") query = query.eq("status", status);
  if (userIds) query = query.in("user_id", userIds);
  const { data, count, error } = await query;
  // Past the end PostgREST answers 416; page 1 then tells the caller the real total.
  if (error?.code === RANGE_NOT_SATISFIABLE && page > 1) return loadOrders(status, search, 1);
  if (error) {
    console.error("[orders] list failed", { status, search, page, error: error.message });
    return { rows: [], total: 0, failed: true };
  }

  const orders = data ?? [];
  const [contacts, subs] = await Promise.all([
    contactsById(sb, [...new Set(orders.map((o) => o.user_id as string))]),
    orders.length ? sb.from("subscriptions").select("order_id, status, current_period_end").in("order_id", orders.map((o) => o.id)) : null,
  ]);
  if (subs?.error) console.error("[orders] subscription lookup failed", subs.error.message);
  const subOf = new Map((subs?.data ?? []).map((s) => [s.order_id as string, { status: s.status as string, currentPeriodEnd: (s.current_period_end as string | null) ?? null }]));

  return {
    total: count ?? 0,
    failed: false,
    rows: orders.map((o) => ({
      id: o.id,
      userId: o.user_id,
      email: contacts.get(o.user_id)?.email ?? null,
      name: contacts.get(o.user_id)?.name ?? null,
      offerId: o.offer_id,
      offer: (o.offers as unknown as { title: string } | null)?.title ?? null,
      status: o.status,
      amountCents: o.amount_cents,
      currency: o.currency,
      provider: o.provider,
      createdAt: o.created_at,
      subscription: subOf.get(o.id) ?? null,
    })),
  };
}
