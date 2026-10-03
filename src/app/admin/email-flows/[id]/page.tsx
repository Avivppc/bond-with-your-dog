import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { loadFlow } from "@/lib/flows/server/admin";
import { percent } from "@/lib/flows/stats";
import { formatUsd } from "@/lib/flows/discount";
import { findNode } from "@/lib/flows/graph";
import { BTN_DANGER, Card, MUTED, PageHeader, StatusPill, TABLE, TD, TH, THEAD, TROW } from "../../_components/ui";
import { StatCard, shortDate } from "../../_components/list-kit";
import { ConfirmSubmit } from "../../_components/ConfirmSubmit";
import { deleteFlow } from "../actions";
import { FlowBuilder } from "./FlowBuilder";

export const dynamic = "force-dynamic";

const STATUS_TONE = { live: "published", paused: "warning", draft: "draft" } as const;
const RUN_LABEL: Record<string, string> = { active: "In the flow", waiting: "Waiting", done: "Finished", exited: "Left" };
const EXIT_LABEL: Record<string, string> = { purchased: "bought", step_removed: "step removed", too_many_steps: "error" };

export default async function EmailFlowPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("sales");
  const { id } = await params;
  const sb = createServiceClient();
  const [detail, chaptersRes] = await Promise.all([loadFlow(sb, id), sb.from("courses").select("id, title, chapter_number").not("chapter_number", "is", null).order("chapter_number")]);
  if (!detail) notFound();
  const { flow, totals, steps, atStep, recent } = detail;
  // Chapters that have a next chapter to sell (the last one doesn't).
  const chapters = (chaptersRes.data ?? []).slice(0, -1).map((c) => ({ id: c.id as string, title: c.title as string }));

  return (
    <>
      <PageHeader
        title={flow.name}
        crumbs={[{ label: "Email flows", href: "/admin/email-flows" }, { label: flow.name }]}
        actions={<StatusPill tone={STATUS_TONE[flow.status]}>{flow.status[0].toUpperCase() + flow.status.slice(1)}</StatusPill>}
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Entered" value={String(totals.entered)} hint={`${totals.inFlow} in the flow now`} />
        <StatCard label="Emails sent" value={String(totals.emails.sent)} />
        <StatCard label="Open rate" value={percent(totals.emails.openRate)} />
        <StatCard label="Click rate" value={percent(totals.emails.clickRate)} />
        <StatCard label="Purchases" value={String(totals.converted)} hint={`${percent(totals.conversionRate)} · ${formatUsd(totals.revenueCents)}`} />
      </div>

      <FlowBuilder
        flowId={flow.id}
        status={flow.status}
        settings={{
          name: flow.name,
          trigger: flow.trigger,
          courseId: flow.course_id,
          discountPercent: flow.discount_percent,
          discountValidDays: flow.discount_valid_days,
        }}
        graph={flow.graph}
        chapters={chapters}
        stats={{ steps, atStep }}
      />

      <Card title="Recent members" description="The last 15 people who entered this flow." className="mt-6" flush>
        {recent.length === 0 ? (
          <p className={`px-5 pb-5 text-[14px] ${MUTED}`}>Nobody yet. Members enter at the daily run after they reach the trigger while the flow is live.</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className={TABLE}>
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Member</th>
                  <th className={TH}>Entered</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Step</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((m) => {
                  const node = findNode(flow.graph, m.nodeId);
                  return (
                    <tr key={`${m.email}-${m.startedAt}`} className={TROW}>
                      <td className={TD}>{m.email}</td>
                      <td className={TD}>{shortDate(m.startedAt)}</td>
                      <td className={TD}>
                        {RUN_LABEL[m.status] ?? m.status}
                        {m.exitReason && <span className={MUTED}> · {EXIT_LABEL[m.exitReason] ?? m.exitReason}</span>}
                      </td>
                      <td className={TD}>{node?.type === "email" ? node.data.subject : (node?.type ?? "—")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <form action={deleteFlow} className="mt-6">
        <input type="hidden" name="id" value={flow.id} />
        <ConfirmSubmit className={BTN_DANGER} message="Delete this flow? Its numbers are deleted too. Codes already sent keep working.">
          Delete flow
        </ConfirmSubmit>
      </form>
    </>
  );
}
