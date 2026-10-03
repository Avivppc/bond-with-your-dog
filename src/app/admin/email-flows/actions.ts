"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/email";
import { renderEmailDoc } from "@/lib/email-blocks/render";
import { validateGraph } from "@/lib/flows/graph";
import { flowSettingsSchema, parseEmailDoc, parseGraph, type FlowSettings } from "@/lib/flows/schema";
import { FLOW_TEMPLATES } from "@/lib/flows/templates";
import { normalizeParams } from "@/lib/flows/triggers";
import { EXAMPLE_VARS } from "@/lib/flows/template";
import { sendMarketingEmail, unsubscribeLinks } from "@/lib/flows/server/send";

export type FlowActionResult = { ok: true; message?: string } | { ok: false; error: string; problems?: string[] };

const LIST = "/admin/email-flows";

/** Creates a flow from a template and opens it in the builder. */
export async function createFlow(formData: FormData): Promise<void> {
  const { user } = await requireStaff("sales");
  const template = FLOW_TEMPLATES.find((t) => t.key === formData.get("template")) ?? FLOW_TEMPLATES[0];
  const { data, error } = await createServiceClient()
    .from("email_flows")
    .insert({
      name: template.name,
      trigger: template.trigger,
      trigger_params: normalizeParams(template.trigger, template.triggerParams),
      offer: template.offer,
      goal: template.goal,
      reentry: template.reentry,
      discount_percent: template.discountPercent,
      discount_valid_days: template.discountValidDays,
      graph: template.graph,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[email flows] create failed", { error: error.message });
    redirect(`${LIST}?error=create`);
  }
  revalidatePath(LIST);
  redirect(`${LIST}/${data.id}`);
}

/** A copy of a flow as a new draft (numbers start from zero). */
export async function duplicateFlow(formData: FormData): Promise<void> {
  const { user } = await requireStaff("sales");
  const sb = createServiceClient();
  const { data: flow } = await sb
    .from("email_flows")
    .select("name, trigger, trigger_params, offer, goal, reentry, smart_sending_hours, quiet_hours, discount_percent, discount_valid_days, graph")
    .eq("id", String(formData.get("id") ?? ""))
    .maybeSingle();
  if (!flow) redirect(LIST);
  const { data, error } = await sb
    .from("email_flows")
    .insert({ ...flow, name: `${flow.name} (copy)`.slice(0, 120), status: "draft", created_by: user.id })
    .select("id")
    .single();
  if (error) redirect(`${LIST}?error=create`);
  revalidatePath(LIST);
  redirect(`${LIST}/${data.id}`);
}

/** Same trigger settings, whatever order the keys come back in from the database. */
function sameParams(a: unknown, b: object): boolean {
  const sorted = (o: unknown) => JSON.stringify(Object.entries((o ?? {}) as object).sort(([x], [y]) => x.localeCompare(y)));
  return sorted(a) === sorted(b);
}

/** Saves the builder: settings and the graph. A live flow must stay valid; drafts may be half-done. */
export async function saveFlow(id: string, settings: FlowSettings, graphInput: unknown): Promise<FlowActionResult> {
  await requireStaff("sales");
  const parsedSettings = flowSettingsSchema.safeParse(settings);
  if (!parsedSettings.success) return { ok: false, error: parsedSettings.error.issues[0]?.message ?? "Check the flow settings." };
  const parsedGraph = parseGraph(graphInput);
  if (!parsedGraph.ok) return { ok: false, error: parsedGraph.error };

  const sb = createServiceClient();
  const { data: current } = await sb.from("email_flows").select("status, trigger, trigger_params").eq("id", id).maybeSingle();
  if (!current) return { ok: false, error: "This flow no longer exists." };
  const problems = validateGraph(parsedGraph.graph);
  if (current.status === "live" && problems.length > 0) return { ok: false, error: "A live flow has to stay complete. Fix these, or pause it first:", problems };

  const s = parsedSettings.data;
  const params = normalizeParams(s.trigger, s.triggerParams);
  // A live flow with a new trigger starts counting from now, not from when it first went live
  // (otherwise everyone who matched the new trigger since then would enter at once).
  const triggerChanged = current.trigger !== s.trigger || !sameParams(current.trigger_params, params);
  const { error } = await sb
    .from("email_flows")
    .update({
      name: s.name,
      trigger: s.trigger,
      trigger_params: params,
      ...(current.status === "live" && triggerChanged ? { live_since: new Date().toISOString() } : {}),
      offer: s.offer,
      goal: s.goal,
      reentry: s.reentry,
      discount_percent: s.discountPercent,
      discount_valid_days: s.discountValidDays,
      smart_sending_hours: s.smartSendingHours,
      quiet_hours: s.quietHours,
      graph: parsedGraph.graph,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) {
    console.error("[email flows] save failed", { id, error: error.message });
    return { ok: false, error: "Couldn't save. Try again." };
  }
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
  return problems.length ? { ok: true, message: `Saved as a draft. Before going live: ${problems[0]}` } : { ok: true, message: "Saved." };
}

/**
 * Live / paused. Going live (or resuming) checks the flow first and counts people from that moment
 * on, so whoever hit the trigger while it was paused doesn't arrive all at once.
 */
export async function setFlowStatus(id: string, status: "live" | "paused"): Promise<FlowActionResult> {
  await requireStaff("sales");
  const sb = createServiceClient();
  const { data: flow } = await sb.from("email_flows").select("graph, status, live_since").eq("id", id).maybeSingle();
  if (!flow) return { ok: false, error: "This flow no longer exists." };
  if (status === "live") {
    const parsed = parseGraph(flow.graph);
    const problems = parsed.ok ? validateGraph(parsed.graph) : [parsed.error];
    if (problems.length) return { ok: false, error: "Finish these before going live:", problems };
  }
  const { error } = await sb
    .from("email_flows")
    .update({ status, live_since: status === "live" && flow.status !== "live" ? new Date().toISOString() : flow.live_since, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "Couldn't change the status. Try again." };
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
  return { ok: true, message: status === "live" ? "Live. People who hit the trigger from now on enter within 15 minutes." : "Paused. Nobody new enters and no emails go out." };
}

export async function deleteFlow(formData: FormData): Promise<void> {
  await requireStaff("sales");
  const id = String(formData.get("id") ?? "");
  const { error } = await createServiceClient().from("email_flows").delete().eq("id", id);
  if (error) console.error("[email flows] delete failed", { id, error: error.message });
  revalidatePath(LIST);
  redirect(LIST);
}

/** Sends an email (from a flow step or a campaign) to the signed-in team member, with example details. */
export async function sendTestEmail(docInput: unknown): Promise<FlowActionResult> {
  const { user } = await requireStaff("sales");
  const parsed = parseEmailDoc(docInput);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  if (!parsed.doc.subject.trim() || parsed.doc.blocks.length === 0) return { ok: false, error: "Add a subject and some content first." };
  if (!user.email) return { ok: false, error: "Your account has no email address." };
  const firstName = String(user.user_metadata?.full_name ?? "").split(/\s+/)[0] || EXAMPLE_VARS.first_name;
  const links = unsubscribeLinks({ userId: user.id, email: user.email });
  const rendered = renderEmailDoc(parsed.doc, { siteUrl: siteUrl(), vars: { ...EXAMPLE_VARS, first_name: firstName }, unsubscribeUrl: links.page });
  const result = await sendMarketingEmail({ to: user.email, subject: `[Test] ${rendered.subject}`, html: rendered.html, text: rendered.text, unsubscribe: links });
  if (!result.ok) return { ok: false, error: `Couldn't send: ${result.error}` };
  return { ok: true, message: `Test sent to ${user.email}.` };
}
