import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatCents } from "@/lib/sales/pricing";
import { AFFILIATE_COLUMNS, affiliateLink, loadAffiliateStats, type Affiliate } from "@/lib/affiliates/server";
import { BTN_PRIMARY, Card, EmptyState, INPUT, LABEL, MUTED, Notice, PageHeader, StatusPill, TABLE, TD, TH, THEAD, TROW } from "../_components/ui";
import { createAffiliate } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Affiliates" };

/** Partners who share a link and earn a commission (members' "refer a friend" lives in Referrals). */
export default async function AffiliatesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff("sales");
  const params = await searchParams;
  const { data, error } = await createServiceClient().from("affiliates").select(AFFILIATE_COLUMNS).order("created_at", { ascending: false });
  if (error) console.error("[affiliates] list failed", error.message);
  const affiliates = (data ?? []) as Affiliate[];
  const stats = await Promise.all(affiliates.map((a) => loadAffiliateStats(a.id)));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Affiliates"
        description="Partners, trainers or influencers who share a link to Bonded. Purchases within 30 days of their link earn them a commission, which you pay them and mark paid here."
      />
      {typeof params.ok === "string" && <Notice tone="success">{params.ok}</Notice>}
      {typeof params.error === "string" && <Notice tone="error">{params.error}</Notice>}

      <Card title="Your affiliates" flush>
        {affiliates.length === 0 ? (
          <EmptyState title="No affiliates yet.">Add the first one below; they get a link like bonded.dog/a/their-name.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className={TABLE}>
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Affiliate</th>
                  <th className={`${TH} max-md:hidden`}>Link</th>
                  <th className={TH}>Visits</th>
                  <th className={TH}>Sales</th>
                  <th className={TH}>To pay</th>
                  <th className={`${TH} max-lg:hidden`}>Paid</th>
                  <th className={TH}>Status</th>
                </tr>
              </thead>
              <tbody>
                {affiliates.map((a, i) => (
                  <tr key={a.id} className={TROW}>
                    <td className={TD}>
                      <Link href={`/admin/affiliates/${a.id}`} className="font-medium hover:underline">
                        {a.name}
                      </Link>
                      <span className={`block text-[12px] ${MUTED}`}>
                        {a.email} · {a.commission_percent}%
                      </span>
                    </td>
                    <td className={`${TD} font-mono text-[13px] max-md:hidden`}>{affiliateLink(a.code).replace(/^https?:\/\//, "")}</td>
                    <td className={`${TD} tabular-nums`}>{stats[i].visits}</td>
                    <td className={`${TD} tabular-nums`}>{stats[i].sales}</td>
                    <td className={`${TD} tabular-nums font-medium`}>{formatCents(stats[i].pendingCents, "USD")}</td>
                    <td className={`${TD} tabular-nums text-[#6c6a69] max-lg:hidden`}>{formatCents(stats[i].paidCents, "USD")}</td>
                    <td className={TD}>
                      <StatusPill tone={a.active ? "published" : "draft"}>{a.active ? "Active" : "Off"}</StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="New affiliate">
        <form action={createAffiliate} className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Name</span>
            <input name="name" required maxLength={80} className={INPUT} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Email</span>
            <input name="email" type="email" required maxLength={254} className={INPUT} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Link code</span>
            <span className="flex items-center gap-1 text-[14px]">
              <span className={MUTED}>bonded.dog/a/</span>
              <input name="code" required maxLength={30} placeholder="dana" className={`${INPUT} lowercase`} />
            </span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className={LABEL}>Commission (%)</span>
            <input name="commission_percent" type="number" required min={1} max={90} defaultValue={20} className={INPUT} />
          </label>
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className={LABEL}>Note (only the team sees it)</span>
            <input name="note" maxLength={200} placeholder="Agility trainer, Tel Aviv" className={INPUT} />
          </label>
          <label className="flex items-center gap-2 text-[14px] md:col-span-2">
            <input type="checkbox" name="send_welcome" defaultChecked className="h-4 w-4 accent-[#343332]" />
            Email them their link and where to see their numbers
          </label>
          <div className="md:col-span-2">
            <button type="submit" className={BTN_PRIMARY}>
              Add affiliate
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
