import "server-only";
import { flowTotals, statsByStep, type FlowTotals, type MessageRow, type RunRow, type StepStats } from "../stats";
import { FLOW_COLUMNS, type FlowRow } from "./people";
import { fetchAll, type ServiceClient } from "./data";

/** Reads for the admin's Email flows screens (service role, after requireStaff). */

const MESSAGE_COLUMNS = "flow_id, node_id, variant, status, delivered_at, opened_at, clicked_at, bounced_at, complained_at";

interface RunWithMember extends RunRow {
  id: string;
  flow_id: string;
  /** Null for quiz leads, who have only an address. */
  user_id: string | null;
  email: string | null;
  target_course_id: string | null;
  started_at: string;
  node_id: string;
}

const RUN_FIELDS = "id, flow_id, user_id, email, target_course_id, started_at, node_id, status, exit_reason";

/** Paid orders for the chapter each run sells, placed after the member entered the flow. */
async function conversions(sb: ServiceClient, runs: readonly RunWithMember[]): Promise<Map<string, { amount_cents: number }[]>> {
  const byFlow = new Map<string, { amount_cents: number }[]>();
  const users = new Set(runs.map((r) => r.user_id).filter((u): u is string => Boolean(u)));
  if (users.size === 0) return byFlow;
  // Every paid order, paged, then matched here: a list of thousands of members won't fit in a URL.
  const paid = await fetchAll<{ user_id: string; amount_cents: number; paid_at: string | null; offer: unknown }>((from, to) =>
    sb.from("orders").select("user_id, amount_cents, paid_at, offer:offers(offer_courses(course_id))").eq("status", "paid").order("id").range(from, to),
  );
  const orders = paid.filter((o) => users.has(o.user_id)).map((o) => {
    const offer = o.offer as unknown as { offer_courses: { course_id: string }[] } | null;
    return { user_id: o.user_id as string, amount_cents: o.amount_cents as number, paid_at: o.paid_at as string | null, courses: (offer?.offer_courses ?? []).map((c) => c.course_id) };
  });
  for (const run of runs) {
    const target = run.target_course_id;
    const hit = target && orders.find((o) => o.user_id === run.user_id && o.courses.includes(target) && o.paid_at && o.paid_at >= run.started_at);
    if (hit) byFlow.set(run.flow_id, [...(byFlow.get(run.flow_id) ?? []), { amount_cents: hit.amount_cents }]);
  }
  return byFlow;
}

export interface FlowListItem {
  flow: FlowRow;
  totals: FlowTotals;
}

export async function loadFlowList(sb: ServiceClient): Promise<FlowListItem[]> {
  const [flowsRes, runs, messages] = await Promise.all([
    sb.from("email_flows").select(FLOW_COLUMNS).order("created_at"),
    fetchAll<RunWithMember>((from, to) => sb.from("email_flow_runs").select(RUN_FIELDS).order("id").range(from, to)),
    fetchAll<MessageRow & { flow_id: string }>((from, to) => sb.from("email_messages").select(MESSAGE_COLUMNS).not("flow_id", "is", null).order("id").range(from, to)),
  ]);
  if (flowsRes.error) console.error("[flows admin] flows failed", { error: flowsRes.error.message });
  const conv = await conversions(sb, runs);
  return ((flowsRes.data ?? []) as unknown as FlowRow[]).map((flow) => ({
    flow,
    totals: flowTotals(
      runs.filter((r) => r.flow_id === flow.id),
      messages.filter((m) => m.flow_id === flow.id),
      conv.get(flow.id) ?? [],
    ),
  }));
}

export interface FlowMember {
  email: string;
  status: RunRow["status"];
  exitReason: string | null;
  nodeId: string;
  startedAt: string;
}

export interface FlowDetail {
  flow: FlowRow;
  totals: FlowTotals;
  steps: Record<string, StepStats & { variants: Record<string, StepStats> }>;
  /** Members currently sitting at each step. */
  atStep: Record<string, number>;
  recent: FlowMember[];
}

export async function loadFlow(sb: ServiceClient, id: string): Promise<FlowDetail | null> {
  const { data: flow } = await sb.from("email_flows").select(FLOW_COLUMNS).eq("id", id).maybeSingle();
  if (!flow) return null;
  const [runs, messages] = await Promise.all([
    fetchAll<RunWithMember>((from, to) => sb.from("email_flow_runs").select(RUN_FIELDS).eq("flow_id", id).order("started_at", { ascending: false }).order("id").range(from, to)),
    fetchAll<MessageRow>((from, to) => sb.from("email_messages").select(MESSAGE_COLUMNS).eq("flow_id", id).order("id").range(from, to)),
  ]);
  const conv = await conversions(sb, runs);

  const atStep: Record<string, number> = {};
  for (const r of runs) if (r.status === "active" || r.status === "waiting") atStep[r.node_id] = (atStep[r.node_id] ?? 0) + 1;

  const recentRuns = runs.slice(0, 15);
  // Members are looked up by account (their address may have changed); leads carry their address.
  const emails = await Promise.all(
    recentRuns.map((r) => (r.user_id ? sb.auth.admin.getUserById(r.user_id).then((u) => u.data.user?.email ?? "—") : Promise.resolve(r.email ?? "—"))),
  );
  return {
    flow: flow as unknown as FlowRow,
    totals: flowTotals(runs, messages, conv.get(id) ?? []),
    steps: Object.fromEntries(statsByStep(messages)),
    atStep,
    recent: recentRuns.map((r, i) => ({ email: emails[i], status: r.status, exitReason: r.exit_reason, nodeId: r.node_id, startedAt: r.started_at })),
  };
}
