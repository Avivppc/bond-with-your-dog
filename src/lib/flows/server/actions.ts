import "server-only";
import { createHmac } from "node:crypto";
import { lookup } from "node:dns/promises";
import { sendEmail, siteUrl } from "@/lib/email";
import { teamRecipient } from "@/lib/notifications";
import { isPrivateAddress, isPublicHttpsUrl, normalizeTag, type ActionData } from "../actions";
import type { ActionNode } from "../graph";
import { exactLike } from "../like";
import type { ServiceClient } from "./data";
import type { EmailSettings } from "./email-settings";
import type { FlowRow, Person, RunRow } from "./people";

/**
 * Carries out a flow's action steps. Each returns what happened: "done", "skipped" (it doesn't
 * apply, e.g. giving a chapter to a quiz lead) or "failed" (worth trying again next run; `permanent`
 * when it never will work).
 */

export type ActionOutcome = { status: "done" | "skipped"; detail?: string } | { status: "failed"; detail: string; permanent: boolean };

const WEBHOOK_TIMEOUT_MS = 8_000;

const skipped = (detail: string): ActionOutcome => ({ status: "skipped", detail });
const failed = (detail: string, permanent = false): ActionOutcome => ({ status: "failed", detail, permanent });

/** A lifetime access grant from this flow (like any purchase or manual grant, so recomputes keep it). */
async function grantChapter(sb: ServiceClient, flow: FlowRow, run: RunRow, courseId: string): Promise<ActionOutcome> {
  if (!run.user_id) return skipped("quiz leads have no account");
  const { data, error } = await sb.rpc("grant_flow_access", { p_user_id: run.user_id, p_course_id: courseId, p_flow_id: flow.id });
  if (error) return failed(error.message);
  return data === "already" ? skipped("already has the chapter") : { status: "done" };
}

/** Takes back only what this flow gave; purchases and other grants stay. */
async function revokeChapter(sb: ServiceClient, flow: FlowRow, run: RunRow, courseId: string): Promise<ActionOutcome> {
  if (!run.user_id) return skipped("quiz leads have no account");
  const { data, error } = await sb.rpc("revoke_flow_access", { p_user_id: run.user_id, p_course_id: courseId, p_flow_id: flow.id });
  if (error) return failed(error.message);
  return data === "none" ? skipped("this flow gave no chapter to take back") : { status: "done" };
}

async function setTag(sb: ServiceClient, flow: FlowRow, run: RunRow, person: Person, rawTag: string, add: boolean): Promise<ActionOutcome> {
  const tag = normalizeTag(rawTag);
  if (!tag) return failed("invalid tag", true);
  if (!person.email) return skipped("no email address");
  if (add) {
    const { error } = await sb.from("contact_tags").insert({ email: person.email, user_id: run.user_id, tag, source: `flow:${flow.id}` });
    if (error && error.code !== "23505") return failed(error.message);
    return { status: "done" };
  }
  const { error } = await sb.from("contact_tags").delete().eq("tag", tag).ilike("email", exactLike(person.email));
  return error ? failed(error.message) : { status: "done" };
}

function fillNote(message: string, flow: FlowRow, person: Person): string {
  const vars: Record<string, string> = { first_name: person.firstName, dog_name: person.dogName, email: person.email ?? "", flow_name: flow.name };
  return message.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, key: string) => vars[key] ?? "");
}

async function notifyTeam(flow: FlowRow, person: Person, message: string, settings: EmailSettings): Promise<ActionOutcome> {
  const to = teamRecipient(settings.teamEmail, process.env.COACH_INBOX);
  if (!to) return failed("no team email in Settings → Notifications", true);
  const who = [person.firstName, person.email].filter(Boolean).join(" · ") || "Someone";
  const sent = await sendEmail({
    to,
    art: "none",
    subject: `[${flow.name}] ${who}`,
    text: `${fillNote(message, flow, person)}\n\nFlow: ${flow.name}\nPerson: ${who}\n\nOpen the flow: ${siteUrl()}/admin/email-flows/${flow.id}`,
  });
  return sent ? { status: "done" } : failed("the team email didn't send");
}

async function postWebhook(flow: FlowRow, run: RunRow, person: Person, node: ActionNode, url: string): Promise<ActionOutcome> {
  if (!isPublicHttpsUrl(url)) return failed("not a public https address", true);
  // A public name can still point inside a network: check where it resolves right before sending.
  try {
    const addresses = await lookup(new URL(url).hostname, { all: true });
    if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) return failed("the address points to a private network", true);
  } catch (error: unknown) {
    return failed(`couldn't resolve the address: ${error instanceof Error ? error.message : String(error)}`);
  }
  const body = JSON.stringify({
    // The same id on every retry of this step for this person, so receivers can ignore repeats.
    id: `${run.id}:${node.id}`,
    event: "flow.step",
    flow: { id: flow.id, name: flow.name, trigger: flow.trigger },
    step: node.id,
    person: { email: person.email, firstName: person.firstName, dogName: person.dogName, memberId: run.user_id },
    context: run.context,
    sentAt: new Date().toISOString(),
  });
  const headers: Record<string, string> = { "content-type": "application/json", "user-agent": "Bonded-Flows/1" };
  // Receivers can check the request came from us when a signing secret is set.
  const secret = process.env.FLOW_WEBHOOK_SECRET;
  if (secret) headers["x-bonded-signature"] = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  try {
    const res = await fetch(url, { method: "POST", headers, body, redirect: "error", signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS) });
    if (res.ok) return { status: "done", detail: String(res.status) };
    // 4xx (except rate limits) means the receiver rejects this request; retrying won't help.
    return failed(`HTTP ${res.status}`, res.status >= 400 && res.status < 500 && res.status !== 429);
  } catch (error: unknown) {
    return failed(error instanceof Error ? error.message : String(error));
  }
}

export async function runAction(sb: ServiceClient, flow: FlowRow, run: RunRow, person: Person, node: ActionNode, settings: EmailSettings): Promise<ActionOutcome> {
  const data: ActionData = node.data;
  switch (data.action) {
    case "grant_chapter":
      return data.courseId ? grantChapter(sb, flow, run, data.courseId) : failed("no chapter picked", true);
    case "revoke_chapter":
      return data.courseId ? revokeChapter(sb, flow, run, data.courseId) : failed("no chapter picked", true);
    case "add_tag":
    case "remove_tag":
      return setTag(sb, flow, run, person, data.tag ?? "", data.action === "add_tag");
    case "notify_team":
      return notifyTeam(flow, person, data.message ?? "", settings);
    case "webhook":
      return postWebhook(flow, run, person, node, data.url ?? "");
    default:
      return failed("unknown action", true);
  }
}
