import "server-only";
import { siteUrl } from "@/lib/email";
import { bucketFor, planRun, type RunFacts, type RunPlan } from "../engine";
import { findNode, triggerNode, type FlowGraph, type FlowTrigger } from "../graph";
import { renderFlowEmail, type FlowVars } from "../template";
import { discountedCents, formatUsd } from "../discount";
import { chapterOffer, ensureCode, ownsChapter, type ServiceClient } from "./data";
import { sendMarketingEmail } from "./send";

/**
 * The daily flow job: enrol members who reached a live flow's trigger, then move every due run
 * forward (send, wait, branch, finish). Safe to run twice at once: each member is leased while they
 * move, and every email step is logged before it's sent, so nothing goes out twice.
 */

export interface FlowRow {
  id: string;
  name: string;
  status: "draft" | "live" | "paused";
  trigger: FlowTrigger;
  course_id: string | null;
  discount_percent: number | null;
  discount_valid_days: number | null;
  graph: FlowGraph;
  live_since: string | null;
}

interface RunRow {
  id: string;
  flow_id: string;
  user_id: string;
  course_id: string;
  target_course_id: string;
  status: string;
  node_id: string;
  wait_until: string | null;
  last_email_node_id: string | null;
  updated_at: string;
}

export interface FlowJobSummary {
  ok: boolean;
  enrolled: number;
  advanced: number;
  sent: number;
  failed: number;
}

/** Runs moved per job: comfortably inside the 60-second function limit. */
const RUNS_PER_JOB = 200;

async function enrol(sb: ServiceClient, flow: FlowRow): Promise<number> {
  const start = triggerNode(flow.graph);
  if (!start || !flow.live_since) return 0;
  const { data, error } = await sb.rpc("flow_candidates", { p_trigger: flow.trigger, p_course_id: flow.course_id, p_since: flow.live_since });
  if (error) {
    console.error("[flows] candidates failed", { flow: flow.id, error: error.message });
    return 0;
  }
  const rows = ((data ?? []) as { user_id: string; course_id: string; target_course_id: string }[]).map((c) => ({
    flow_id: flow.id,
    user_id: c.user_id,
    course_id: c.course_id,
    target_course_id: c.target_course_id,
    node_id: start.id,
  }));
  if (rows.length === 0) return 0;
  const { data: inserted, error: insertError } = await sb.from("email_flow_runs").upsert(rows, { onConflict: "flow_id,user_id,course_id", ignoreDuplicates: true }).select("id");
  if (insertError) console.error("[flows] enrol failed", { flow: flow.id, error: insertError.message });
  return inserted?.length ?? 0;
}

async function memberFacts(sb: ServiceClient, run: RunRow, now: Date): Promise<RunFacts> {
  const [purchased, unsubRes, msgRes] = await Promise.all([
    ownsChapter(sb, run.user_id, run.target_course_id, now),
    sb.from("email_unsubscribes").select("user_id").eq("user_id", run.user_id).maybeSingle(),
    sb.from("email_messages").select("node_id, opened_at, clicked_at").eq("run_id", run.id),
  ]);
  if (unsubRes.error || msgRes.error) throw new Error(`member facts unavailable: ${unsubRes.error?.message ?? msgRes.error?.message}`);
  const messages = msgRes.data ?? [];
  return {
    purchased,
    unsubscribed: Boolean(unsubRes.data),
    opened: (nodeId) => messages.some((m) => m.node_id === nodeId && m.opened_at),
    clicked: (nodeId) => messages.some((m) => m.node_id === nodeId && m.clicked_at),
    bucket: bucketFor(run.id),
  };
}

/** Everything the email tags need for this member; issues their personal code when the flow has one. */
export async function memberVars(sb: ServiceClient, flow: Pick<FlowRow, "id" | "discount_percent" | "discount_valid_days">, run: Pick<RunRow, "user_id" | "course_id" | "target_course_id">, now: Date): Promise<{ vars: FlowVars; email: string | null }> {
  const [userRes, profileRes, coursesRes, offer] = await Promise.all([
    sb.auth.admin.getUserById(run.user_id),
    sb.from("profiles").select("full_name, dog_name, active_dog_id").eq("id", run.user_id).maybeSingle(),
    sb.from("courses").select("id, title").in("id", [run.course_id, run.target_course_id]),
    chapterOffer(sb, run.target_course_id),
  ]);
  const profile = profileRes.data;
  let dog = profile?.dog_name ?? "";
  if (profile?.active_dog_id) {
    const { data } = await sb.from("dogs").select("name").eq("id", profile.active_dog_id).maybeSingle();
    dog = data?.name ?? dog;
  }
  const title = (id: string) => coursesRes.data?.find((c) => c.id === id)?.title ?? "";
  const code =
    flow.discount_percent && flow.discount_valid_days
      ? await ensureCode(sb, { userId: run.user_id, courseId: run.target_course_id, percent: flow.discount_percent, validDays: flow.discount_valid_days, flowId: flow.id }, now)
      : null;
  const offerUrl = offer ? `${siteUrl()}/checkout/${offer.slug}${code ? `?code=${encodeURIComponent(code.code)}` : ""}` : `${siteUrl()}/my-courses`;
  return {
    email: userRes.data.user?.email ?? null,
    vars: {
      first_name: (profile?.full_name ?? "").trim().split(/\s+/)[0] ?? "",
      dog_name: dog,
      chapter: title(run.course_id),
      next_chapter: title(run.target_course_id),
      price: offer ? formatUsd(offer.priceCents) : "",
      discount_percent: code ? `${code.percent}%` : "",
      discounted_price: offer && code ? formatUsd(discountedCents(offer.priceCents, code.percent)) : offer ? formatUsd(offer.priceCents) : "",
      discount_code: code?.code ?? "",
      discount_expires: code ? new Date(code.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" }) : "",
      offer_url: offerUrl,
    },
  };
}

/** "sent": delivered or deliberately skipped; "retry": a send failed, try this step again next run. */
type DeliverOutcome = { sent: number; failed: number; retry: boolean };

/**
 * Sends the plan's emails. Each step is logged as "queued" before it goes out (one row per member and
 * step), and Resend gets an idempotency key, so a crash or a second job never sends the same email twice.
 */
async function deliver(sb: ServiceClient, flow: FlowRow, run: RunRow, plan: RunPlan, now: Date): Promise<DeliverOutcome> {
  const outcome: DeliverOutcome = { sent: 0, failed: 0, retry: false };
  let member: Awaited<ReturnType<typeof memberVars>> | null = null;
  for (const action of plan.actions) {
    const node = findNode(flow.graph, action.nodeId);
    if (node?.type !== "email") continue;
    const base = { flow_id: flow.id, run_id: run.id, node_id: node.id, user_id: run.user_id, variant: action.kind === "send" ? action.variant : null };
    if (action.kind === "skip") {
      await sb.from("email_messages").insert({ ...base, to_email: "", subject: node.data.subject, status: "skipped" });
      continue;
    }
    member ??= await memberVars(sb, flow, run, now);
    const rendered = renderFlowEmail(node.data, member.vars);
    const { data: queued, error: queueError } = await sb
      .from("email_messages")
      .insert({ ...base, to_email: member.email ?? "", subject: rendered.subject, status: "queued" })
      .select("id")
      .single();
    if (queueError?.code === "23505") continue; // this step already went out (an earlier run or another job)
    if (queueError || !queued) {
      console.error("[flows] queue failed", { run: run.id, node: node.id, error: queueError?.message });
      outcome.retry = true;
      break;
    }
    const result = member.email
      ? await sendMarketingEmail({ to: member.email, subject: rendered.subject, text: rendered.text, preheader: node.data.preheader, userId: run.user_id, idempotencyKey: `${run.id}:${node.id}` })
      : ({ ok: false, error: "no email address", permanent: true } as const);
    if (result.ok) {
      await sb.from("email_messages").update({ status: "sent", provider_id: result.providerId }).eq("id", queued.id);
      outcome.sent++;
      continue;
    }
    console.error("[flows] send failed", { flow: flow.id, run: run.id, node: node.id, error: result.error });
    outcome.failed++;
    // A permanent failure is recorded as skipped and the flow moves on; anything else is retried next run.
    await sb.from("email_messages").update({ status: result.permanent ? "skipped" : "failed" }).eq("id", queued.id);
    if (!result.permanent) {
      outcome.retry = true;
      break;
    }
  }
  return outcome;
}

/** A job that died mid-run releases its members after this long. */
const LEASE_MS = 10 * 60 * 1000;

async function advance(sb: ServiceClient, flow: FlowRow, run: RunRow, now: Date): Promise<DeliverOutcome | null> {
  // Lease the run: only one job moves a member at a time.
  const { data: claimed } = await sb
    .from("email_flow_runs")
    .update({ claimed_at: now.toISOString() })
    .eq("id", run.id)
    .or(`claimed_at.is.null,claimed_at.lt.${new Date(now.getTime() - LEASE_MS).toISOString()}`)
    .select("id");
  if (!claimed?.length) return null;
  const release = () => sb.from("email_flow_runs").update({ claimed_at: null }).eq("id", run.id);

  try {
    const facts = await memberFacts(sb, run, now);
    const plan = planRun(flow.graph, { nodeId: run.node_id, waitUntil: run.wait_until, lastEmailNodeId: run.last_email_node_id }, facts, now);
    const outcome = await deliver(sb, flow, run, plan, now);
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

/** Stop starting new members before Vercel's 60-second limit. */
const TIME_BUDGET_MS = 45_000;

export async function runFlows(sb: ServiceClient, now: Date = new Date()): Promise<FlowJobSummary> {
  const summary: FlowJobSummary = { ok: true, enrolled: 0, advanced: 0, sent: 0, failed: 0 };
  const { data: flows, error } = await sb.from("email_flows").select("id, name, status, trigger, course_id, discount_percent, discount_valid_days, graph, live_since").eq("status", "live");
  if (error) {
    console.error("[flows] load failed", { error: error.message });
    return { ...summary, ok: false };
  }
  const live = (flows ?? []) as FlowRow[];
  for (const flow of live) summary.enrolled += await enrol(sb, flow);
  if (live.length === 0) return summary;

  const { data: runs, error: runsError } = await sb
    .from("email_flow_runs")
    .select("id, flow_id, user_id, course_id, target_course_id, status, node_id, wait_until, last_email_node_id, updated_at")
    .in("flow_id", live.map((f) => f.id))
    .in("status", ["active", "waiting"])
    .or(`wait_until.is.null,wait_until.lte.${now.toISOString()}`)
    .order("updated_at")
    .limit(RUNS_PER_JOB);
  if (runsError) {
    console.error("[flows] due runs failed", { error: runsError.message });
    return { ...summary, ok: false };
  }
  const started = Date.now();
  for (const run of (runs ?? []) as RunRow[]) {
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
