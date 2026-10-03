import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin";
import { exitReasonLabel, exitsOf } from "@/lib/flows/exits";
import { changeRun } from "../run-actions";
import { createServiceClient } from "@/lib/supabase/admin";
import { loadFlow } from "@/lib/flows/server/admin";
import { percent } from "@/lib/flows/stats";
import { formatUsd } from "@/lib/flows/discount";
import { findNode } from "@/lib/flows/graph";
import { BTN_DANGER, BTN_SECONDARY, Card, MUTED, PageHeader, StatusPill, TABLE, TD, TH, THEAD, TROW } from "../../_components/ui";
import { StatCard, shortDate } from "../../_components/list-kit";
import { ConfirmSubmit } from "../../_components/ConfirmSubmit";
import { siteUrl } from "@/lib/email";
import { deleteFlow, duplicateFlow } from "../actions";
import { FlowBuilder } from "./FlowBuilder";

export const dynamic = "force-dynamic";
export const metadata = { title: "Email flow" };

const STATUS_TONE = { live: "published", paused: "warning", draft: "draft" } as const;
const RUN_LABEL: Record<string, string> = { active: "In the flow", waiting: "Waiting", paused: "Paused", done: "Finished", exited: "Left" };
const DONE_NOTE: Record<string, string> = { pause: "Paused. They stay on their step until you resume them.", resume: "Resumed. They continue from their step.", remove: "Removed from the flow." };

function RunButtons({ flowId, runId, status }: { flowId: string; runId: string; status: string }) {
  const ops: { op: "pause" | "resume" | "remove"; label: string }[] =
    status === "paused" ? [{ op: "resume", label: "Resume" }, { op: "remove", label: "Remove" }]
    : status === "active" || status === "waiting" ? [{ op: "pause", label: "Pause" }, { op: "remove", label: "Remove" }]
    : [];
  return (
    <div className="flex gap-1.5">
      {ops.map(({ op, label }) => (
        <form key={op} action={changeRun}>
          <input type="hidden" name="flow_id" value={flowId} />
          <input type="hidden" name="run_id" value={runId} />
          <input type="hidden" name="op" value={op} />
          <button type="submit" className="rounded-[6px] border border-[#e7e6e4] px-2 py-1 text-[12px] hover:bg-[#f3f3f2]">
            {label}
          </button>
        </form>
      ))}
    </div>
  );
}


export default async function EmailFlowPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ find?: string; done?: string }> }) {
  const { find, done } = await searchParams;
  const findEmail = typeof find === "string" ? find.trim().slice(0, 320) : "";
  await requireStaff("sales");
  const { id } = await params;
  const sb = createServiceClient();
  const [detail, chaptersRes] = await Promise.all([loadFlow(sb, id, findEmail || null), sb.from("courses").select("id, title, chapter_number").not("chapter_number", "is", null).order("chapter_number")]);
  if (!detail) notFound();
  const { flow, totals, steps, atStep, actionsDone, recent } = detail;
  const chapters = (chaptersRes.data ?? []).map((c) => ({ id: c.id as string, title: c.title as string }));

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
          triggerParams: flow.trigger_params ?? {},
          offer: flow.offer ?? { kind: "none" },
          exits: exitsOf(flow.exit_conditions, flow.goal),
          reentry: flow.reentry,
          discountPercent: flow.discount_percent,
          discountValidDays: flow.discount_valid_days,
          smartSendingHours: flow.smart_sending_hours,
          quietHours: flow.quiet_hours,
          consent: flow.consent ?? "marketing",
        }}
        siteUrl={siteUrl()}
        graph={flow.graph}
        chapters={chapters}
        stats={{ steps, atStep, actionsDone }}
      />

      <div id="people" className="mt-6" />
      <Card
        title={findEmail ? `People matching ${findEmail}` : "Recent people"}
        description={findEmail ? undefined : "The last 15 people who entered. Find anyone by email to pause, resume or remove them."}
        flush
        actions={
          <form className="flex gap-2" action={`/admin/email-flows/${flow.id}#people`}>
            <input name="find" type="email" defaultValue={findEmail} placeholder="Find by email" aria-label="Find a person by email" className="rounded-[8px] border border-[#e7e6e4] px-3 py-1.5 text-[13px]" />
            <button type="submit" className={BTN_SECONDARY}>
              Find
            </button>
          </form>
        }
      >
        {typeof done === "string" && DONE_NOTE[done] && <p className="mx-5 mb-3 rounded-[8px] bg-[#e3f5e8] px-3 py-2 text-[13px] text-[#1c6b35]">{DONE_NOTE[done]}</p>}
        {recent.length === 0 ? (
          <p className={`px-5 pb-5 text-[14px] ${MUTED}`}>{findEmail ? "Nobody with that email is in this flow." : "Nobody yet. People enter within 15 minutes of reaching the trigger while the flow is live."}</p>
        ) : (
          <div className="relative overflow-x-auto">
            <table className={TABLE}>
              <thead className={THEAD}>
                <tr>
                  <th className={TH}>Member</th>
                  <th className={TH}>Entered</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Step</th>
                  <th className={TH}></th>
                </tr>
              </thead>
              <tbody>
                {recent.map((m) => {
                  const node = findNode(flow.graph, m.nodeId);
                  return (
                    <tr key={m.runId} className={TROW}>
                      <td className={TD}>{m.email}</td>
                      <td className={TD}>{shortDate(m.startedAt)}</td>
                      <td className={TD}>
                        {RUN_LABEL[m.status] ?? m.status}
                        {m.exitReason && <span className={MUTED}> · {exitReasonLabel(m.exitReason)}</span>}
                      </td>
                      <td className={TD}>{node?.type === "email" ? node.data.subject : (node?.type ?? "—")}</td>
                      <td className={TD}>
                        <RunButtons flowId={flow.id} runId={m.runId} status={m.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="mt-6 flex flex-wrap gap-2">
      <form action={duplicateFlow}>
        <input type="hidden" name="id" value={flow.id} />
        <button type="submit" className={BTN_SECONDARY}>
          Duplicate flow
        </button>
      </form>
      <form action={deleteFlow}>
        <input type="hidden" name="id" value={flow.id} />
        <ConfirmSubmit className={BTN_DANGER} message="Delete this flow? Its numbers are deleted too. Codes already sent keep working.">
          Delete flow
        </ConfirmSubmit>
      </form>
      </div>
    </>
  );
}
