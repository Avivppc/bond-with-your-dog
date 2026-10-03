"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { campaignStarterDoc } from "@/lib/email-blocks/defaults";
import { emailHasContent } from "@/lib/flows/graph";
import { audienceSchema, campaignSchema } from "@/lib/flows/schema";
import { audienceSize, type Audience } from "@/lib/flows/server/campaigns";

export type CampaignActionResult = { ok: true; message?: string } | { ok: false; error: string };

const LIST = "/admin/campaigns";

export async function createCampaign(): Promise<void> {
  const { user } = await requireStaff("sales");
  const { data, error } = await createServiceClient()
    .from("email_campaigns")
    .insert({ name: "New campaign", email: campaignStarterDoc(), created_by: user.id })
    .select("id")
    .single();
  if (error) {
    console.error("[campaigns] create failed", { error: error.message });
    redirect(`${LIST}?error=create`);
  }
  revalidatePath(LIST);
  redirect(`${LIST}/${data.id}`);
}

/** Saves a draft (name, audience, email). Sent or sending campaigns can't change. */
export async function saveCampaign(id: string, input: unknown): Promise<CampaignActionResult> {
  await requireStaff("sales");
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the campaign." };
  const { data, error } = await createServiceClient()
    .from("email_campaigns")
    .update({ name: parsed.data.name, audience: parsed.data.audience, email: parsed.data.email, updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["draft", "scheduled"])
    .select("id");
  if (error) return { ok: false, error: "Couldn't save. Try again." };
  if (!data?.length) return { ok: false, error: "This campaign has already gone out and can't be changed." };
  revalidatePath(`${LIST}/${id}`);
  return { ok: true, message: "Saved." };
}

/** How many people the audience reaches right now (unsubscribed people are left out). */
export async function countAudience(input: unknown): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  await requireStaff("sales");
  const parsed = audienceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the audience." };
  try {
    return { ok: true, count: await audienceSize(createServiceClient(), parsed.data as Audience) };
  } catch {
    return { ok: false, error: "Couldn't count the audience." };
  }
}

/**
 * Schedules the campaign (at = ISO time) or sends it within 15 minutes (at = null). Saves first and
 * checks the email is complete.
 */
export async function scheduleCampaign(id: string, input: unknown, at: string | null): Promise<CampaignActionResult> {
  const saved = await saveCampaign(id, input);
  if (!saved.ok) return saved;
  const parsed = campaignSchema.parse(input);
  if (!parsed.email.subject.trim() || !emailHasContent(parsed.email)) return { ok: false, error: "Add a subject and some content before sending." };
  const when = at ? new Date(at) : new Date();
  if (Number.isNaN(when.getTime())) return { ok: false, error: "Pick a valid date and time." };
  const { data, error } = await createServiceClient()
    .from("email_campaigns")
    .update({ status: "scheduled", scheduled_at: when.toISOString(), updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["draft", "scheduled"])
    .select("id");
  if (error || !data?.length) return { ok: false, error: "Couldn't schedule. Try again." };
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
  return { ok: true, message: at ? "Scheduled." : "On its way: it goes out within 15 minutes." };
}

/** Back to draft before it starts sending. */
export async function unscheduleCampaign(id: string): Promise<CampaignActionResult> {
  await requireStaff("sales");
  const { data } = await createServiceClient().from("email_campaigns").update({ status: "draft", scheduled_at: null }).eq("id", id).eq("status", "scheduled").select("id");
  if (!data?.length) return { ok: false, error: "It has already started sending." };
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
  return { ok: true, message: "Unscheduled. It's a draft again." };
}

/**
 * Stops a campaign that's sending: whoever hasn't been sent to yet is dropped, and the numbers so far
 * stay. A batch already on its way finishes.
 */
export async function stopCampaign(formData: FormData): Promise<void> {
  await requireStaff("sales");
  const id = String(formData.get("id") ?? "");
  const sb = createServiceClient();
  const { data, error } = await sb.from("email_campaigns").update({ status: "canceled", sent_at: new Date().toISOString() }).eq("id", id).eq("status", "sending").select("id");
  if (error) console.error("[campaigns] stop failed", { id, error: error.message });
  if (data?.length) {
    const { error: dropError } = await sb.from("email_messages").delete().eq("campaign_id", id).eq("status", "queued");
    if (dropError) console.error("[campaigns] dropping the queue failed", { id, error: dropError.message });
  }
  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
}

export async function deleteCampaign(formData: FormData): Promise<void> {
  await requireStaff("sales");
  const id = String(formData.get("id") ?? "");
  const { error } = await createServiceClient().from("email_campaigns").delete().eq("id", id).neq("status", "sending");
  if (error) console.error("[campaigns] delete failed", { id, error: error.message });
  revalidatePath(LIST);
  redirect(LIST);
}

export async function duplicateCampaign(formData: FormData): Promise<void> {
  const { user } = await requireStaff("sales");
  const sb = createServiceClient();
  const { data: c } = await sb.from("email_campaigns").select("name, audience, email").eq("id", String(formData.get("id") ?? "")).maybeSingle();
  if (!c) redirect(LIST);
  const { data, error } = await sb.from("email_campaigns").insert({ ...c, name: `${c.name} (copy)`.slice(0, 120), created_by: user.id }).select("id").single();
  if (error) redirect(`${LIST}?error=create`);
  revalidatePath(LIST);
  redirect(`${LIST}/${data.id}`);
}
