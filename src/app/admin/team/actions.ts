"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { roleChangeError } from "@/lib/team";
import type { StaffRole } from "@/lib/staff";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bonded.dog";

function back(params: Record<string, string>): never {
  redirect(`/admin/team?${new URLSearchParams(params).toString()}`);
}

/** Tells the invitee how to get in. Skipped (with a warning) when Resend isn't configured. */
async function sendInviteEmail(email: string, role: string, inviterEmail: string | undefined): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn("[team] Resend not configured; invite saved without email", { email });
    return false;
  }
  const loginUrl = `${SITE_URL}/login?next=/admin`;
  const { error } = await new Resend(apiKey).emails.send({
    from,
    to: email,
    subject: "You've been invited to manage the Bonded academy",
    text: [
      `Hi,`,
      ``,
      `${inviterEmail ?? "The Bonded team"} invited you to the Bonded admin as ${role === "owner" ? "an owner" : "a content editor"}.`,
      ``,
      `1. Open ${loginUrl}`,
      `2. Sign in — or create an account — using this email address (${email}).`,
      `3. Confirm your email if asked. You'll land in the admin area.`,
    ].join("\n"),
  });
  if (error) {
    console.error("[team] invite email failed", { email, error: error.message });
    return false;
  }
  return true;
}

const ChangeSchema = z.object({ user_id: z.string().uuid(), role: z.enum(["owner", "editor"]) });

/** Switches a team member between owner and content editor. */
export async function changeStaffRole(formData: FormData): Promise<void> {
  const { user } = await requireStaff("staff");
  const parsed = ChangeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back({ error: "Invalid request." });
  const { user_id: targetId, role } = parsed.data;

  const sb = createServiceClient();
  const [{ data: member, error: memberError }, { count: owners, error: countError }] = await Promise.all([
    sb.from("staff_members").select("role").eq("user_id", targetId).maybeSingle(),
    sb.from("staff_members").select("user_id", { count: "exact", head: true }).eq("role", "owner"),
  ]);
  if (memberError || countError || !member) {
    console.error("[team] role lookup failed", { targetId, error: memberError?.message ?? countError?.message });
    back({ error: "Could not read this person's access. Please try again." });
  }
  const blocked = roleChangeError({ actorId: user.id, targetId, from: member.role as StaffRole, to: role, owners: owners ?? 0 });
  if (blocked) back({ error: blocked });

  const { error } = await sb.from("staff_members").update({ role }).eq("user_id", targetId);
  if (error) {
    console.error("[team] role change failed", { targetId, role, error: error.message });
    back({ error: "Could not change the role." });
  }
  revalidatePath("/admin/team");
  revalidatePath(`/admin/people/${targetId}`);
  back({ ok: role === "owner" ? "They're now an owner." : "They're now a content editor." });
}

/** Sends the invitation email again (e.g. it went to spam). */
export async function resendInvite(formData: FormData): Promise<void> {
  const { user } = await requireStaff("staff");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) back({ error: "Invalid invite." });

  const { data: invite, error } = await createServiceClient().from("staff_invites").select("email, role").eq("id", id.data).is("accepted_at", null).maybeSingle();
  if (error || !invite) {
    if (error) console.error("[team] invite lookup failed", { id: id.data, error: error.message });
    back({ error: "That invite is no longer pending." });
  }
  const emailed = await sendInviteEmail(invite.email, invite.role, user.email);
  back(emailed ? { ok: `Invite sent again to ${invite.email}.` } : { error: "Email isn't set up yet (Resend). Use “Send invite” above with the same email to get a fresh one-time link to send yourself." });
}

export async function revokeInvite(formData: FormData): Promise<void> {
  await requireStaff("staff");
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) back({ error: "Invalid invite." });

  const { error } = await createServiceClient().from("staff_invites").delete().eq("id", id.data).is("accepted_at", null);
  if (error) {
    console.error("[team] revoke invite failed", { id: id.data, error: error.message });
    back({ error: "Could not revoke the invite." });
  }
  revalidatePath("/admin/team");
  back({ ok: "Invite revoked." });
}

export async function removeStaffMember(formData: FormData): Promise<void> {
  const { user } = await requireStaff("staff");
  const target = z.string().uuid().safeParse(formData.get("user_id"));
  if (!target.success) back({ error: "Invalid member." });
  if (target.data === user.id) back({ error: "You can't remove yourself." });

  const sb = createServiceClient();
  const { data: member } = await sb.from("staff_members").select("role").eq("user_id", target.data).maybeSingle();
  if (member?.role === "owner") {
    const { count } = await sb.from("staff_members").select("user_id", { count: "exact", head: true }).eq("role", "owner");
    if ((count ?? 0) <= 1) back({ error: "Keep at least one owner." });
  }

  const { error } = await sb.from("staff_members").delete().eq("user_id", target.data);
  if (error) {
    console.error("[team] remove member failed", { target: target.data, error: error.message });
    back({ error: "Could not remove the member." });
  }
  // Free the (unique) invite email so this person can be invited again later.
  const { error: inviteError } = await sb.from("staff_invites").delete().eq("accepted_by", target.data);
  if (inviteError) console.error("[team] invite cleanup failed", { target: target.data, error: inviteError.message });
  revalidatePath("/admin/team");
  back({ ok: "Access removed." });
}
