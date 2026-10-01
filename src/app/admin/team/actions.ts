"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { issueTeamInviteLink, type TeamRoleName } from "./team-invite-email";
import { roleChangeError } from "@/lib/team";
import type { StaffRole } from "@/lib/staff";


function back(params: Record<string, string>): never {
  redirect(`/admin/team?${new URLSearchParams(params).toString()}`);
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
  const { data: account } = await createServiceClient().rpc("find_account_by_email", { p_email: invite.email }).maybeSingle<{ user_id: string }>();
  const issued = await issueTeamInviteLink(invite.email, invite.role as TeamRoleName, Boolean(account), user.email);
  if (!issued.ok) back({ error: `Could not create a new link: ${issued.reason}` });
  back(issued.emailed ? { ok: `Invite sent again to ${invite.email}, with a fresh link.` } : { error: "Email isn't set up yet (Resend). Use “Send invite” above with the same email to get a fresh one-time link to send yourself." });
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
