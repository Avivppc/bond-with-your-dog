"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";

const RoleSchema = z.object({ user_id: z.string().uuid(), role: z.enum(["owner", "editor", "none"]) });

function back(userId: string, params: Record<string, string>): never {
  redirect(`/admin/people/${userId}?${new URLSearchParams(params).toString()}#team`);
}

async function ownerCount(): Promise<number> {
  const { count, error } = await createServiceClient().from("staff_members").select("user_id", { count: "exact", head: true }).eq("role", "owner");
  if (error) throw new Error(`owner count failed: ${error.message}`);
  return count ?? 0;
}

/** Makes a contact an owner or editor, or removes them from the team (owners only). */
export async function setTeamRole(formData: FormData): Promise<void> {
  const { user } = await requireStaff("staff");
  const parsed = RoleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/people?error=Invalid+request.");
  const { user_id: userId, role } = parsed.data;
  if (userId === user.id && role !== "owner") back(userId, { error: "You can't change your own role. Ask another owner." });

  const sb = createServiceClient();
  const { data: current, error: currentError } = await sb.from("staff_members").select("role").eq("user_id", userId).maybeSingle();
  if (currentError) {
    console.error("[person] role lookup failed", { userId, error: currentError.message });
    back(userId, { error: "Could not read the current role." });
  }
  if (current?.role === "owner" && role !== "owner") {
    const owners = await ownerCount().catch((error: unknown) => {
      console.error("[person] owner check failed", { userId, error: error instanceof Error ? error.message : error });
      return null;
    });
    if (owners === null) back(userId, { error: "Could not check the team's owners." });
    if (owners <= 1) back(userId, { error: "Keep at least one owner." });
  }

  const { error } =
    role === "none"
      ? await sb.from("staff_members").delete().eq("user_id", userId)
      : await sb.from("staff_members").upsert({ user_id: userId, role }, { onConflict: "user_id" });
  if (error) {
    console.error("[person] role change failed", { userId, role, error: error.message });
    back(userId, { error: "Could not change the role." });
  }
  if (role === "none") {
    // Free the (unique) invite email so this person can be invited again later.
    const { error: inviteError } = await sb.from("staff_invites").delete().eq("accepted_by", userId);
    if (inviteError) console.error("[person] invite cleanup failed", { userId, error: inviteError.message });
  }
  revalidatePath(`/admin/people/${userId}`);
  revalidatePath("/admin/team");
  back(userId, { ok: role === "none" ? "Removed from the team." : `Role set to ${role}.` });
}
