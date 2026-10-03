import "server-only";
import { siteUrl } from "@/lib/email";
import { bucketFor, type RunFacts } from "../engine";
import type { FlowGraph } from "../graph";
import type { FlowGoal, FlowOffer, FlowTrigger, TriggerParams } from "../triggers";
import type { FlowVars } from "../template";
import { discountedCents, formatUsd } from "../discount";
import { exactLike } from "../like";
import { quietHoldUntil } from "../quiet-hours";
import { chapterOffer, ensureCode, ownsChapter, type ServiceClient } from "./data";

/** A live flow as the runner reads it. */
export interface FlowRow {
  id: string;
  name: string;
  status: "draft" | "live" | "paused";
  trigger: FlowTrigger;
  trigger_params: TriggerParams;
  offer: FlowOffer;
  goal: FlowGoal;
  reentry: "once" | "each_time";
  smart_sending_hours: number;
  quiet_hours: boolean;
  discount_percent: number | null;
  discount_valid_days: number | null;
  graph: FlowGraph;
  live_since: string | null;
}

export const FLOW_COLUMNS =
  "id, name, status, trigger, trigger_params, offer, goal, reentry, smart_sending_hours, quiet_hours, discount_percent, discount_valid_days, graph, live_since";

/** What happened that put this person in the flow (chapter, lesson, order…), from the trigger. */
export interface RunContext {
  courseId?: string;
  targetCourseId?: string;
  lessonId?: string;
  orderId?: string;
  offerId?: string;
  videoId?: string;
  codeId?: string;
  firstName?: string;
}

export interface RunRow {
  id: string;
  flow_id: string;
  user_id: string | null;
  email: string | null;
  course_id: string | null;
  target_course_id: string | null;
  context: RunContext;
  status: string;
  node_id: string;
  wait_until: string | null;
  last_email_node_id: string | null;
  started_at: string;
}

export const RUN_COLUMNS = "id, flow_id, user_id, email, course_id, target_course_id, context, status, node_id, wait_until, last_email_node_id, started_at";

/** The chapter the flow sells this person (its code, price and checkout link), if any. */
export async function targetChapter(sb: ServiceClient, offer: FlowOffer, context: RunContext): Promise<string | null> {
  if (offer.kind === "next_chapter") return context.targetCourseId ?? null;
  if (offer.kind === "chapter") return offer.courseId ?? null;
  if (offer.kind === "abandoned_offer" && context.offerId) {
    const { data } = await sb.from("offer_courses").select("course_id").eq("offer_id", context.offerId).eq("access_level", "full");
    return data?.length === 1 ? data[0].course_id : null;
  }
  return null;
}

async function paidSince(sb: ServiceClient, userId: string, since: string, offerId?: string): Promise<boolean> {
  let query = sb.from("orders").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "paid").gte("paid_at", since);
  if (offerId) query = query.eq("offer_id", offerId);
  const { count, error } = await query;
  if (error) throw new Error(`orders unavailable: ${error.message}`);
  return (count ?? 0) > 0;
}

async function accountFor(sb: ServiceClient, run: RunRow): Promise<string | null> {
  if (run.user_id) return run.user_id;
  if (!run.email) return null;
  const { data, error } = await sb.rpc("user_id_for_email", { p_email: run.email });
  if (error) throw new Error(`account lookup failed: ${error.message}`);
  return (data as string | null) ?? null;
}

async function goalReached(sb: ServiceClient, flow: FlowRow, run: RunRow, now: Date): Promise<boolean> {
  const user = run.user_id;
  switch (flow.goal.kind) {
    case "none":
      return false;
    case "bought_offer":
      if (!user) return false;
      if (run.target_course_id) return ownsChapter(sb, user, run.target_course_id, now);
      return run.context.offerId ? paidSince(sb, user, run.started_at, run.context.offerId) : false;
    case "any_purchase":
      return user ? paidSince(sb, user, run.started_at) : false;
    case "practiced": {
      if (!user) return false;
      const { count } = await sb.from("practice_sessions").select("id", { count: "exact", head: true }).eq("user_id", user).gte("created_at", run.started_at);
      return (count ?? 0) > 0;
    }
    case "signed_up":
      return Boolean(await accountFor(sb, run));
  }
}

/** Answers for every member-data condition in the graph (opened/clicked are answered by the engine). */
async function conditionAnswers(sb: ServiceClient, flow: FlowRow, run: RunRow, now: Date): Promise<Map<string, boolean>> {
  const answers = new Map<string, boolean>();
  for (const node of flow.graph.nodes) {
    if (node.type !== "condition" || node.data.check === "opened" || node.data.check === "clicked") continue;
    const user = run.user_id;
    const { check, courseId, days } = node.data;
    let yes = false;
    if (check === "is_member") yes = Boolean(await accountFor(sb, run));
    else if (user && check === "owns_chapter" && courseId) yes = await ownsChapter(sb, user, courseId, now);
    else if (user && check === "completed_chapter" && courseId) {
      const { count } = await sb.from("certificates").select("id", { count: "exact", head: true }).eq("user_id", user).eq("course_id", courseId);
      yes = (count ?? 0) > 0;
    } else if (user && check === "practiced_recently") {
      const since = new Date(now.getTime() - (days ?? 7) * 86_400_000).toISOString().slice(0, 10);
      const { count } = await sb.from("practice_sessions").select("id", { count: "exact", head: true }).eq("user_id", user).gte("practiced_on", since);
      yes = (count ?? 0) > 0;
    } else if (user && check === "has_purchased") {
      const { count } = await sb.from("orders").select("id", { count: "exact", head: true }).eq("user_id", user).eq("status", "paid");
      yes = (count ?? 0) > 0;
    }
    answers.set(node.id, yes);
  }
  return answers;
}

/** Everything the engine needs to decide this person's next steps. Throws when the data can't be read (the run waits). */
export async function personFacts(sb: ServiceClient, flow: FlowRow, run: RunRow, recipient: string | null, timezone: string | null, now: Date): Promise<RunFacts> {
  const [goal, unsubRes, msgRes, recentRes, answers] = await Promise.all([
    goalReached(sb, flow, run, now),
    sb.rpc("is_unsubscribed", { p_user_id: run.user_id, p_email: recipient }),
    sb.from("email_messages").select("node_id, opened_at, clicked_at").eq("run_id", run.id),
    flow.smart_sending_hours > 0 && recipient
      ? sb
          .from("email_messages")
          .select("id", { count: "exact", head: true })
          .ilike("to_email", exactLike(recipient))
          .eq("status", "sent")
          .gte("sent_at", new Date(now.getTime() - flow.smart_sending_hours * 3_600_000).toISOString())
      : Promise.resolve({ count: 0, error: null }),
    conditionAnswers(sb, flow, run, now),
  ]);
  if (unsubRes.error || msgRes.error || recentRes.error) {
    throw new Error(`person facts unavailable: ${unsubRes.error?.message ?? msgRes.error?.message ?? recentRes.error?.message}`);
  }
  const messages = msgRes.data ?? [];
  return {
    goalReached: goal,
    unsubscribed: Boolean(unsubRes.data) || !recipient,
    recentlyEmailed: (recentRes.count ?? 0) > 0,
    holdUntil: flow.quiet_hours ? quietHoldUntil(now, timezone) : null,
    opened: (nodeId) => messages.some((m) => m.node_id === nodeId && m.opened_at),
    clicked: (nodeId) => messages.some((m) => m.node_id === nodeId && m.clicked_at),
    condition: (nodeId) => answers.get(nodeId) ?? false,
    bucket: bucketFor(run.id),
  };
}

export interface Person {
  email: string | null;
  timezone: string | null;
  firstName: string;
  dogName: string;
}

/** Who this run is for: address, time zone and names (members from their profile, leads from the quiz). */
export async function loadPerson(sb: ServiceClient, run: RunRow): Promise<Person> {
  if (!run.user_id) return { email: run.email, timezone: null, firstName: run.context.firstName ?? "", dogName: "" };
  const [userRes, profileRes] = await Promise.all([
    sb.auth.admin.getUserById(run.user_id),
    sb.from("profiles").select("full_name, dog_name, active_dog_id, timezone").eq("id", run.user_id).maybeSingle(),
  ]);
  const profile = profileRes.data;
  let dog = profile?.dog_name ?? "";
  if (profile?.active_dog_id) {
    const { data } = await sb.from("dogs").select("name").eq("id", profile.active_dog_id).maybeSingle();
    dog = data?.name ?? dog;
  }
  return {
    email: run.email ?? userRes.data.user?.email ?? null,
    timezone: profile?.timezone ?? null,
    firstName: (profile?.full_name ?? "").trim().split(/\s+/)[0] ?? "",
    dogName: dog,
  };
}

/** The {{tags}} for this person's emails; issues their personal code when the flow gives one. */
export async function personVars(sb: ServiceClient, flow: FlowRow, run: RunRow, person: Person, now: Date): Promise<FlowVars> {
  const site = siteUrl();
  const ids = [run.course_id, run.target_course_id].filter((v): v is string => Boolean(v));
  const [coursesRes, offer, lessonRes, abandonedRes] = await Promise.all([
    ids.length ? sb.from("courses").select("id, title").in("id", ids) : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    run.target_course_id ? chapterOffer(sb, run.target_course_id) : Promise.resolve(null),
    run.context.lessonId ? sb.from("lessons").select("title").eq("id", run.context.lessonId).maybeSingle() : Promise.resolve({ data: null }),
    flow.offer.kind === "abandoned_offer" && run.context.offerId ? sb.from("offers").select("slug, title").eq("id", run.context.offerId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const title = (id: string | null) => coursesRes.data?.find((c) => c.id === id)?.title ?? "";
  const code =
    run.user_id && run.target_course_id && offer && flow.discount_percent && flow.discount_valid_days
      ? await ensureCode(sb, { userId: run.user_id, courseId: run.target_course_id, percent: flow.discount_percent, validDays: flow.discount_valid_days, flowId: flow.id }, now)
      : null;
  const abandoned = abandonedRes.data as { slug: string; title: string } | null;
  const slug = offer?.slug ?? abandoned?.slug ?? null;
  const appUrl = run.user_id ? `${site}/home` : `${site}/signup`;
  return {
    first_name: person.firstName,
    dog_name: person.dogName,
    chapter: title(run.course_id),
    next_chapter: title(run.target_course_id),
    price: offer ? formatUsd(offer.priceCents) : "",
    discount_percent: code ? `${code.percent}%` : "",
    discounted_price: offer ? formatUsd(code ? discountedCents(offer.priceCents, code.percent) : offer.priceCents) : "",
    discount_code: code?.code ?? "",
    discount_expires: code ? new Date(code.expiresAt).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" }) : "",
    offer_url: slug ? `${site}/checkout/${slug}${code ? `?code=${encodeURIComponent(code.code)}` : ""}` : appUrl,
    offer_title: abandoned?.title ?? title(run.target_course_id),
    lesson_title: (lessonRes.data as { title: string } | null)?.title ?? "",
    app_url: appUrl,
  };
}
