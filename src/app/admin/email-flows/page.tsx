import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { loadFlowList } from "@/lib/flows/server/admin";
import { FLOW_TEMPLATES, TRIGGER_LABEL } from "@/lib/flows/templates";
import { percent } from "@/lib/flows/stats";
import { formatUsd } from "@/lib/flows/discount";
import { plural } from "@/lib/feedback/format";
import { BTN_SECONDARY, Card, EmptyState, MUTED, Notice, PageHeader, StatusPill, TABLE, TD, TH, THEAD, TROW } from "../_components/ui";
import { StatCard } from "../_components/list-kit";
import { createFlow } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email flows" };

const STATUS_TONE = { live: "published", paused: "warning", draft: "draft" } as const;

export default async function EmailFlowsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireStaff("sales");
  const { error } = await searchParams;
  const items = await loadFlowList(createServiceClient());
  const sum = (pick: (t: (typeof items)[number]["totals"]) => number) => items.reduce((n, i) => n + pick(i.totals), 0);
  const sent = sum((t) => t.emails.sent);
  const delivered = sum((t) => t.emails.delivered) || sent;

  return (
    <>
      <PageHeader title="Email flows" description="Automated emails that offer members the next chapter, with a personal discount code." />
      {error && <Notice tone="error">Couldn&apos;t create the flow. Try again.</Notice>}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Emails sent" value={String(sent)} icon="send" />
        <StatCard label="Open rate" value={percent(delivered ? sum((t) => t.emails.opened) / delivered : 0)} icon="drafts" />
        <StatCard label="Click rate" value={percent(delivered ? sum((t) => t.emails.clicked) / delivered : 0)} icon="ads_click" />
        <StatCard label="Revenue from flows" value={formatUsd(sum((t) => t.revenueCents))} hint={plural(sum((t) => t.converted), "purchase")} icon="payments" />
      </div>

      <Card title="Your flows" flush>
        {items.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState title="No flows yet">Start from a template below. You can change every word and step.</EmptyState>
          </div>
        ) : (
          <div className="relative overflow-x-auto">
            <table className={TABLE}>
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Flow</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Entered</th>
                  <th className={TH}>Sent</th>
                  <th className={TH}>Open rate</th>
                  <th className={TH}>Click rate</th>
                  <th className={TH}>Purchases</th>
                  <th className={TH}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {items.map(({ flow, totals }) => (
                  <tr key={flow.id} className={TROW}>
                    <td className={TD}>
                      <Link href={`/admin/email-flows/${flow.id}`} className="font-medium text-[#1a1a19] hover:underline">
                        {flow.name}
                      </Link>
                      <div className={`text-[12px] ${MUTED}`}>{TRIGGER_LABEL[flow.trigger]}</div>
                    </td>
                    <td className={TD}>
                      <StatusPill tone={STATUS_TONE[flow.status]}>{flow.status[0].toUpperCase() + flow.status.slice(1)}</StatusPill>
                    </td>
                    <td className={TD}>{totals.entered}</td>
                    <td className={TD}>{totals.emails.sent}</td>
                    <td className={TD}>{percent(totals.emails.openRate)}</td>
                    <td className={TD}>{percent(totals.emails.clickRate)}</td>
                    <td className={TD}>
                      {totals.converted} <span className={MUTED}>({percent(totals.conversionRate)})</span>
                    </td>
                    <td className={TD}>{formatUsd(totals.revenueCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <h2 className="mb-3 mt-8 text-base font-semibold text-[#1a1a19]">Start a new flow</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {FLOW_TEMPLATES.map((t) => (
          <form key={t.key} action={createFlow} className="flex flex-col gap-3 rounded-[12px] border border-[#e7e6e4] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <input type="hidden" name="template" value={t.key} />
            <div>
              <p className="font-semibold text-[#1a1a19]">{t.name}</p>
              <p className={`mt-1 text-[14px] ${MUTED}`}>{t.description}</p>
            </div>
            <p className={`text-[12px] ${MUTED}`}>
              Trigger: {TRIGGER_LABEL[t.trigger]} · {t.discountPercent}% code for {t.discountValidDays} days
            </p>
            <button type="submit" className={`${BTN_SECONDARY} self-start`}>
              Use this template
            </button>
          </form>
        ))}
      </div>
    </>
  );
}
