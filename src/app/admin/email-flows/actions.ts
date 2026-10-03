"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { findNode, validateGraph } from "@/lib/flows/graph";
import { flowSettingsSchema, parseGraph, type FlowSettings } from "@/lib/flows/schema";
import { FLOW_TEMPLATES } from "@/lib/flows/templates";
import { EXAMPLE_VARS, renderFlowEmail } from "@/lib/flows/template";
import { sendMarketingEmail } from "@/lib/flows/server/send";

export type FlowActionResult = { ok: true; message?: string } | { ok: false; error: string; problems?: string[] };

const LIST = "/admin/email-flows";

/** Creates a flow from a template (or empty) and opens it in the builder. */
export async function createFlow(formData: FormData): Promise<void> {
  const { user } = await requireStaff("sales");
  const template = FLOW_TEMPLATES.find((t) => t.key === formData.get("template")) ?? FLOW_TEMPLATES[0];
  const { data, error } = await createServiceClient()
    .from("email_flows")
    .insert({
      name: template.name,
      trigger: template.trigger,
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

/** Saves the builder: settings and the graph. A live flow must stay valid; drafts may be half-done. */
export async function saveFlow(id: string, settings: FlowSettings, graphInput: unknown): Promise<FlowActionResult> {
  await requireStaff("sales");
  const parsedSettings = flowSettingsSchema.safeParse(settings);
  if (!parsedSettings.success) return { ok: false, error: parsedSettings.error.issues[0]?.message ?? "Check the flow settings." };
  const parsedGraph = parseGraph(graphInput);
  if (!parsedGraph.ok) return { ok: false, error: parsedGraph.error };

  const sb = createServiceClient();
  const { data: current } = await sb.from("email_flows").select("status").eq("id", id).maybeSingle();
  if (!current) return { ok: false, error: "This flow no longer exists." };
  const problems = validateGraph(parsedGraph.graph);
  if (current.status === "live" && problems.length > 0) return { ok: false, error: "A live flow has to stay complete. Fix these, or pause it first:", problems };

  const s = parsedSettings.data;
  const { error } = await sb
    .from("email_flows")
    .update({
      name: s.name,
      trigger: s.trigger,
      course_id: s.courseId,
      discount_percent: s.discountPercent,
      discount_valid_days: s.discountValidDays,
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

/** Live / paused / draft. Going live checks the flow first and starts counting members from now. */
export async function setFlowStatus(id: string, status: "live" | "paused"): Promise<FlowActionResult> {
  await requireStaff("sales");
  const sb = createServiceClient();
  const { data: flow } = await sb.from("email_flows").select("graph, live_since").eq("id", id).maybeSingle();
  if (!flow) return { ok: false, error: "This flow no longer exists." };
  if (status === "live") {
    const parsed = parseGraph(flow.graph);
    const problems = parsed.ok ? validateGraph(parsed.graph) : [parsed.error];
    if (problems.length) return { ok: false, error: "Finish these before going live:", problems };
  }
  const { error } = await sb
    .from("email_flows")
    .update({ status, live_since: status === "live" ? (flow.live_since ?? new Date().toISOString()) : flow.live_since, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "Couldn't change the status. Try again." };
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
  return { ok: true, message: status === "live" ? "Live. Members who reach the trigger from now on enter at the next daily run." : "Paused. Nobody new enters and no emails go out." };
}

export async function deleteFlow(formData: FormData): Promise<void> {
  await requireStaff("sales");
  const id = String(formData.get("id") ?? "");
  const { error } = await createServiceClient().from("email_flows").delete().eq("id", id);
  if (error) console.error("[email flows] delete failed", { id, error: error.message });
  revalidatePath(LIST);
  redirect(LIST);
}

/** Sends one email step to the signed-in team member, filled with example details. */
export async function sendTestEmail(nodeId: string, graphInput: unknown): Promise<FlowActionResult> {
  const { user } = await requireStaff("sales");
  const parsed = parseGraph(graphInput);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const node = findNode(parsed.graph, nodeId);
  if (node?.type !== "email") return { ok: false, error: "Pick an email step to test." };
  if (!node.data.subject.trim() || !node.data.body.trim()) return { ok: false, error: "Add a subject and text first." };
  if (!user.email) return { ok: false, error: "Your account has no email address." };
  const firstName = String(user.user_metadata?.full_name ?? "").split(/\s+/)[0] || EXAMPLE_VARS.first_name;
  const email = renderFlowEmail(node.data, { ...EXAMPLE_VARS, first_name: firstName });
  const result = await sendMarketingEmail({ to: user.email, subject: `[Test] ${email.subject}`, text: email.text, preheader: node.data.preheader, userId: user.id });
  if (!result.ok) return { ok: false, error: `Couldn't send: ${result.error}` };
  return { ok: true, message: `Test sent to ${user.email}.` };
}
