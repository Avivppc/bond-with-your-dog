import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { loadCampaigns } from "@/lib/flows/server/campaign-stats";
import { percent } from "@/lib/flows/stats";
import { formatUsd } from "@/lib/flows/discount";
import { BTN_PRIMARY, Card, EmptyState, MUTED, Notice, PageHeader, StatusPill, TABLE, TD, TH, THEAD, TROW } from "../_components/ui";
import { shortDate } from "../_components/list-kit";
import { createCampaign } from "./actions";
import { AUDIENCE_LABEL, STATUS_LABEL, STATUS_TONE } from "./audience";

export const dynamic = "force-dynamic";
export const metadata = { title: "Campaigns" };

/** One-off emails to an audience (newsletters, announcements), with their numbers. */
export default async function CampaignsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireStaff("sales");
  const { error } = await searchParams;
  const items = await loadCampaigns(createServiceClient());
  return (
    <>
      <PageHeader
        title="Campaigns"
        description="One email to a group of people, now or at a time you choose."
        actions={
          <form action={createCampaign}>
            <button type="submit" className={BTN_PRIMARY}>
              New campaign
            </button>
          </form>
        }
      />
      {error && <Notice tone="error">Couldn&apos;t create the campaign. Try again.</Notice>}
      <Card flush>
        {items.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState title="No campaigns yet">Write a newsletter or an announcement and choose who gets it.</EmptyState>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <table className={TABLE}>
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Campaign</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Sent</th>
                  <th className={`${TH} max-md:hidden`}>Open rate</th>
                  <th className={`${TH} max-md:hidden`}>Click rate</th>
                  <th className={`${TH} max-md:hidden`}>Purchases</th>
                  <th className={`${TH} max-md:hidden`}>Unsubscribes</th>
                </tr>
              </thead>
              <tbody>
                {items.map(({ campaign: c, stats }) => (
                  <tr key={c.id} className={TROW}>
                    <td className={TD}>
                      <Link href={`/admin/campaigns/${c.id}`} className="font-medium text-[#1a1a19] hover:underline">
                        {c.name}
                      </Link>
                      <div className={`text-[12px] ${MUTED}`}>
                        {AUDIENCE_LABEL[c.audience.kind]}
                        {c.status === "scheduled" && c.scheduled_at ? ` · ${shortDate(c.scheduled_at)}` : ""}
                        {c.sent_at ? ` · sent ${shortDate(c.sent_at)}` : ""}
                      </div>
                    </td>
                    <td className={TD}>
                      <StatusPill tone={STATUS_TONE[c.status]}>{STATUS_LABEL[c.status]}</StatusPill>
                    </td>
                    <td className={TD}>{stats.emails.sent}</td>
                    <td className={`${TD} max-md:hidden`}>{percent(stats.emails.openRate)}</td>
                    <td className={`${TD} max-md:hidden`}>{percent(stats.emails.clickRate)}</td>
                    <td className={`${TD} max-md:hidden`}>
                      {stats.purchases} <span className={MUTED}>· {formatUsd(stats.revenueCents)}</span>
                    </td>
                    <td className={`${TD} max-md:hidden`}>{stats.unsubscribes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
