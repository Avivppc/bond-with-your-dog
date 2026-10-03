import "server-only";
import { siteUrl } from "@/lib/email";
import { emailDocFromNodeData } from "@/lib/email-blocks/defaults";
import { renderEmailDoc } from "@/lib/email-blocks/render";
import { planRun, type RunPlan } from "../engine";
import { findNode, triggerNode } from "../graph";
import type { ServiceClient } from "./data";
import { FLOW_COLUMNS, loadPerson, personFacts, personVars, RUN_COLUMNS, targetChapter, type FlowRow, type Person, type RunContext, type RunRow } from "./people";
import { sendMarketingEmail, unsubscribeLinks } from "./send";

/**
 * The flow job (every 15 minutes, plus a daily Vercel backup): enrol everyone who hit a live flow's
 * trigger, then move every due run forward (send, wait, branch, finish). Safe to run twice at once:
 * each person is leased while they move, and every email step is logged before it's sent.
 */

export type { FlowRow } from "./people";

export interface FlowJobSummary {
  ok: boolean;
  enrolled: number;
  advanced: number;
  sent: number;
  failed: number;
}

/** Runs moved per job: comfortably inside the 60-second function limit. */
const RUNS_PER_JOB = 200;
/** A job that died mid-run releases its people after this long. */
const LEASE_MS = 10 * 60 * 1000;
/** Stop starting new people before Vercel's 60-second limit. */
export const TIME_BUDGET_MS = 45_000;
/** New people fetched per query while enrolling. */
const ENROL_PAGE = 500;
/** Failed tries of one email step before it's skipped (about two hours at one try per job). */
const MAX_SEND_ATTEMPTS = 8;

interface Candidate {
  user_id: string | null;
  email: string | null;
  dedupe_key: string;
  context: RunContext;
}

/** Enrols everyone new for one flow, a page at a time, until nobody is left or time runs out. */
async function enrol(sb: ServiceClient, flow: FlowRow, started: number): Promise<number> {
  const start = triggerNode(flow.graph);
  if (!start || !flow.live_since) return 0;
  let total = 0;
  while (Date.now() - started < TIME_BUDGET_MS) {
    const { data, error } = await sb.rpc("flow_new_candidates", { p_flow_id: flow.id, p_limit: ENROL_PAGE });
    if (error) {
      console.error("[flows] candidates failed", { flow: flow.id, error: error.message });
      return total;
    }
    const candidates = (data ?? []) as Candidate[];
    const added = await enrolPage(sb, flow, start.id, candidates);
    total += added;
    // A short page means everyone is in; no progress means inserts are failing, so stop for now.
    if (candidates.length < ENROL_PAGE || added === 0) return total;
  }
  return total;
}

async function enrolPage(sb: ServiceClient, flow: FlowRow, startId: string, candidates: readonly Candidate[]): Promise<number> {
  if (candidates.length === 0) return 0;
  const rows = await Promise.all(
    candidates.map(async (c) => ({
      flow_id: flow.id,
      user_id: c.user_id,
      email: c.user_id ? null : c.email,
      course_id: c.context.courseId ?? null,
      target_course_id: await targetChapter(sb, flow.offer, c.context),
      context: c.context,
      // "once": one entry per person ever; otherwise once per occurrence (chapter, order, lapse…).
      dedupe_key: flow.reentry === "once" ? "" : c.dedupe_key,
      node_id: startId,
    })),
  );
  const { data: inserted, error: insertError } = await sb.from("email_flow_runs").upsert(rows, { onConflict: "flow_id,subject_key,dedupe_key", ignoreDuplicates: true }).select("id");
  if (insertError) console.error("[flows] enrol failed", { flow: flow.id, error: insertError.message });
  return inserted?.length ?? 0;
}

async function failedAttempts(sb: ServiceClient, runId: string, nodeId: string): Promise<number> {
  const { count } = await sb.from("email_messages").select("id", { count: "exact", head: true }).eq("run_id", runId).eq("node_id", nodeId).eq("status", "failed");
  return count ?? 0;
}

/**
 * A job that died between logging an email as "queued" and sending it left the step looking sent.
 * Once the lease is long gone, mark those as failed so the step is tried again; the send's
 * idempotency key (run + step) stops Resend from delivering it twice if it did go out.
 */
async function releaseStaleQueued(sb: ServiceClient, now: Date): Promise<void> {
  const { error } = await sb
    .from("email_messages")
    .update({ status: "failed" })
    .eq("status", "queued")
    .not("run_id", "is", null)
    .lt("sent_at", new Date(now.getTime() - LEASE_MS).toISOString());
  if (error) console.error("[flows] stale queue cleanup failed", { error: error.message });
}

/** "retry": a send failed for a reason worth retrying; the run stays on this step for the next job. */
type DeliverOutcome = { sent: number; failed: number; retry: boolean };

async function deliver(sb: ServiceClient, flow: FlowRow, run: RunRow, person: Person, plan: RunPlan, now: Date): Promise<DeliverOutcome> {
  const outcome: DeliverOutcome = { sent: 0, failed: 0, retry: false };
  let vars: Awaited<ReturnType<typeof personVars>> | null = null;
  for (const action of plan.actions) {
    const node = findNode(flow.graph, action.nodeId);
    if (node?.type !== "email") continue;
    const doc = emailDocFromNodeData(node.data);
    const base = { flow_id: flow.id, run_id: run.id, node_id: node.id, user_id: run.user_id, to_email: person.email ?? "", variant: action.kind === "send" ? action.variant : null };
    if (action.kind === "skip") {
      await sb.from("email_messages").insert({ ...base, subject: doc.subject, status: "skipped" });
      continue;
    }
    vars ??= await personVars(sb, flow, run, person, now);
    const links = unsubscribeLinks({ userId: run.user_id, email: person.email ?? "" });
    const rendered = renderEmailDoc(doc, { siteUrl: siteUrl(), vars: { ...vars }, unsubscribeUrl: links.page });
    const { data: queued, error: queueError } = await sb.from("email_messages").insert({ ...base, subject: rendered.subject, status: "queued" }).select("id").single();
    if (queueError?.code === "23505") continue; // this step already went out (an earlier run or another job)
    if (queueError || !queued) {
      console.error("[flows] queue failed", { run: run.id, node: node.id, error: queueError?.message });
      outcome.retry = true;
      break;
    }
    const result = person.email
      ? await sendMarketingEmail({ to: person.email, subject: rendered.subject, html: rendered.html, text: rendered.text, unsubscribe: links, idempotencyKey: `${run.id}:${node.id}` })
      : ({ ok: false, error: "no email address", permanent: true } as const);
    if (result.ok) {
      await sb.from("email_messages").update({ status: "sent", provider_id: result.providerId }).eq("id", queued.id);
      outcome.sent++;
      continue;
    }
    console.error("[flows] send failed", { flow: flow.id, run: run.id, node: node.id, error: result.error });
    outcome.failed++;
    // A permanent failure (or one that kept failing) is recorded as skipped and the flow moves on;
    // anything else is retried next run.
    const giveUp = result.permanent || (await failedAttempts(sb, run.id, node.id)) + 1 >= MAX_SEND_ATTEMPTS;
    await sb.from("email_messages").update({ status: giveUp ? "skipped" : "failed" }).eq("id", queued.id);
    if (!giveUp) {
      outcome.retry = true;
      break;
    }
  }
  return outcome;
}

async function advance(sb: ServiceClient, flow: FlowRow, listed: RunRow, now: Date): Promise<DeliverOutcome | null> {
  // Lease the run: only one job moves a person at a time. The lease returns the run as it is now
  // (another job may have moved it since it was listed); a finished run is left alone.
  const { data: claimed } = await sb
    .from("email_flow_runs")
    .update({ claimed_at: now.toISOString() })
    .eq("id", listed.id)
    .in("status", ["active", "waiting"])
    .or(`claimed_at.is.null,claimed_at.lt.${new Date(now.getTime() - LEASE_MS).toISOString()}`)
    .select(RUN_COLUMNS);
  const run = (claimed?.[0] ?? null) as unknown as RunRow | null;
  if (!run) return null;
  // Releasing also moves the run to the back of the queue, so a person stuck on a failing send
  // doesn't hold up everyone else.
  const release = () => sb.from("email_flow_runs").update({ claimed_at: null, updated_at: new Date().toISOString() }).eq("id", run.id);

  try {
    const person = await loadPerson(sb, run);
    const facts = await personFacts(sb, flow, run, person.email, person.timezone, now);
    const plan = planRun(flow.graph, { nodeId: run.node_id, waitUntil: run.wait_until, lastEmailNodeId: run.last_email_node_id }, facts, now);
    const outcome = await deliver(sb, flow, run, person, plan, now);
    if (outcome.retry) {
      await release(); // stay on this step; emails already sent won't go out again
      return outcome;
    }
    const finished = plan.status === "done" || plan.status === "exited";
    const { error } = await sb
      .from("email_flow_runs")
      .update({
        status: plan.status,
        node_id: plan.state.nodeId,
        wait_until: plan.state.waitUntil,
        last_email_node_id: plan.state.lastEmailNodeId,
        exit_reason: plan.exitReason,
        finished_at: finished ? now.toISOString() : null,
        updated_at: new Date().toISOString(),
        claimed_at: null,
      })
      .eq("id", run.id);
    if (error) console.error("[flows] run update failed", { run: run.id, error: error.message });
    return outcome;
  } catch (error: unknown) {
    console.error("[flows] run failed", { run: run.id, error: error instanceof Error ? error.message : String(error) });
    await release();
    return null;
  }
}

export async function runFlows(sb: ServiceClient, now: Date = new Date(), started: number = Date.now()): Promise<FlowJobSummary> {
  const summary: FlowJobSummary = { ok: true, enrolled: 0, advanced: 0, sent: 0, failed: 0 };
  const { data: flows, error } = await sb.from("email_flows").select(FLOW_COLUMNS).eq("status", "live");
  if (error) {
    console.error("[flows] load failed", { error: error.message });
    return { ...summary, ok: false };
  }
  const live = (flows ?? []) as unknown as FlowRow[];
  await releaseStaleQueued(sb, now);
  for (const flow of live) summary.enrolled += await enrol(sb, flow, started);
  if (live.length === 0) return summary;

  const { data: runs, error: runsError } = await sb
    .from("email_flow_runs")
    .select(RUN_COLUMNS)
    .in(
      "flow_id",
      live.map((f) => f.id),
    )
    .in("status", ["active", "waiting"])
    .or(`wait_until.is.null,wait_until.lte.${now.toISOString()}`)
    .order("updated_at")
    .limit(RUNS_PER_JOB);
  if (runsError) {
    console.error("[flows] due runs failed", { error: runsError.message });
    return { ...summary, ok: false };
  }
  for (const run of (runs ?? []) as unknown as RunRow[]) {
    if (Date.now() - started > TIME_BUDGET_MS) break; // the rest wait for the next run
    const flow = live.find((f) => f.id === run.flow_id);
    if (!flow) continue;
    const counts = await advance(sb, flow, run, now);
    if (!counts) continue;
    summary.advanced++;
    summary.sent += counts.sent;
    summary.failed += counts.failed;
  }
  return summary;
}
