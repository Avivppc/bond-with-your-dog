import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatCents } from "@/lib/sales/pricing";
import { AFFILIATE_COLUMNS, affiliateLink, loadAffiliateStats, type Affiliate } from "@/lib/affiliates/server";
import { BTN_PRIMARY, BTN_SECONDARY, Card, EmptyState, INPUT, LABEL, MUTED, Notice, PageHeader, StatusPill, TABLE, TD, TH, THEAD, TROW } from "../../_components/ui";
import { shortDate } from "../../_components/list-kit";
import { CopyLinkButton } from "../../media/CopyLinkButton";
import { markCommissionsPaid, updateAffiliate } from "../actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Affiliate" };

interface CommissionRow {
  id: string;
  base_cents: number;
  percent: number;
  amount_cents: number;
  currency: string;
  status: "pending" | "paid" | "void";
  created_at: string;
  paid_at: string | null;
  voided_at: string | null;
  orders: { offers: { title: string } | null } | null;
}

const TONE = { pending: "warning", paid: "published", void: "draft" } as const;

function statusLabel(c: CommissionRow): string {
  if (c.status === "void") return c.paid_at ? "Refunded after payout" : "Refunded";
  return c.status === "paid" ? "Paid" : "To pay";
}

/** One affiliate: their link, numbers, settings and every commission. */
export default async function AffiliatePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff("sales");
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!z.string().uuid().safeParse(id).success) notFound();
  const sb = createServiceClient();
  const [{ data: row }, { data: commissions, error }, stats] = await Promise.all([
    sb.from("affiliates").select(AFFILIATE_COLUMNS).eq("id", id).maybeSingle(),
    sb
      .from("affiliate_commissions")
      .select("id, base_cents, percent, amount_cents, currency, status, created_at, paid_at, voided_at, orders(offers(title))")
      .eq("affiliate_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
    loadAffiliateStats(id),
  ]);
  if (!row) notFound();
  if (error) console.error("[affiliates] commissions failed", { id, error: error.message });
  const affiliate = row as Affiliate;
  const rows = (commissions ?? []) as unknown as CommissionRow[];
  const link = affiliateLink(affiliate.code);

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader title={affiliate.name} crumbs={[{ label: "Affiliates", href: "/admin/affiliates" }, { label: affiliate.name }]} />
      {typeof query.ok === "string" && <Notice tone="success">{query.ok}</Notice>}
      {typeof query.error === "string" && <Notice tone="error">{query.error}</Notice>}

      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ["Visits", String(stats.visits)],
          ["Sales", String(stats.sales)],
          ["To pay", formatCents(stats.pendingCents, "USD")],
          ["Paid so far", formatCents(stats.paidCents, "USD")],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[12px] border border-[#e7e6e4] bg-white p-4">
            <p className={`text-[12px] ${MUTED}`}>{label}</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <Card title="Link" description="Add ?to=/chapter/foundations (or any page of the site) to send people somewhere specific.">
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded-[8px] bg-[#f3f3f2] px-3 py-2 text-[14px]">{link}</code>
          <CopyLinkButton url={link} />
        </div>
      </Card>

      <Card
        title="Commissions"
        flush
        actions={
          stats.pendingCents > 0 ? (
            <form action={markCommissionsPaid}>
              <input type="hidden" name="id" value={affiliate.id} />
              <input type="hidden" name="upto" value={rows.find((c) => c.status === "pending")?.created_at ?? ""} />
              <button type="submit" className={BTN_PRIMARY}>
                Mark {formatCents(stats.pendingCents, "USD")} as paid
              </button>
            </form>
          ) : null
        }
      >
        {rows.length === 0 ? (
          <EmptyState title="No sales through this link yet." />
        ) : (
          <table className={TABLE}>
            <thead className={THEAD}>
              <tr>
                <th className={TH}>Date</th>
                <th className={TH}>Purchase</th>
                <th className={`${TH} max-md:hidden`}>Paid by buyer</th>
                <th className={TH}>Commission</th>
                <th className={TH}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className={TROW}>
                  <td className={`${TD} whitespace-nowrap`}>{shortDate(c.created_at)}</td>
                  <td className={TD}>{c.orders?.offers?.title ?? "Purchase"}</td>
                  <td className={`${TD} tabular-nums max-md:hidden`}>{formatCents(c.base_cents, c.currency)}</td>
                  <td className={`${TD} tabular-nums font-medium`}>
                    {formatCents(c.amount_cents, c.currency)} <span className={`text-[12px] font-normal ${MUTED}`}>({c.percent}%)</span>
                  </td>
                  <td className={TD}>
                    <StatusPill tone={TONE[c.status]}>{statusLabel(c)}</StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Settings">
        <form action={updateAffiliate} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={affiliate.id} />
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Commission (%) for future sales</span>
            <input name="commission_percent" type="number" min={1} max={90} defaultValue={affiliate.commission_percent} className={INPUT} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Note</span>
            <input name="note" maxLength={200} defaultValue={affiliate.note ?? ""} className={INPUT} />
          </label>
          <label className="flex items-center gap-2 text-[14px] sm:col-span-2">
            <input type="checkbox" name="active" defaultChecked={affiliate.active} className="h-4 w-4 accent-[#343332]" />
            Active (when off, the link still opens the site but earns nothing)
          </label>
          <p className={`text-[12px] sm:col-span-2 ${MUTED}`}>
            {affiliate.email}
            {affiliate.user_id ? " · has a Bonded account (sees their numbers at bonded.dog/affiliate)" : " · no Bonded account yet"}
          </p>
          <div className="sm:col-span-2">
            <button type="submit" className={BTN_SECONDARY}>
              Save
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
