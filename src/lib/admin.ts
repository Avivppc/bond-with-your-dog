import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { canPerform, resolveStaffRole, type StaffCapability, type StaffRole } from "@/lib/staff";

/** Bootstrap owners from ADMIN_EMAILS (comma-separated). Invited staff live in staff_members. */
export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getAdminEmails().includes(email.toLowerCase());
}

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * The caller's staff role from the DB. If they have none yet, try to claim a pending
 * invite for their (verified) email — that is how invited editors get access on first login.
 */
async function loadStaffRole(supabase: ServerSupabase, userId: string): Promise<string | null> {
  const current = await supabase.rpc("current_staff_role");
  if (current.error) console.error("current_staff_role failed", { userId, error: current.error.message });
  if (typeof current.data === "string") return current.data;

  const claimed = await supabase.rpc("claim_staff_invite");
  if (claimed.error) console.error("claim_staff_invite failed", { userId, error: claimed.error.message });
  return typeof claimed.data === "string" ? claimed.data : null;
}

export interface StaffSession {
  user: User;
  role: StaffRole;
}

/**
 * Verify the current user is staff with the given capability (default: content).
 * Redirects to /login when signed out and to /dashboard when not permitted.
 */
export async function requireStaff(capability: StaffCapability = "content"): Promise<StaffSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const role = resolveStaffRole(user.email, await loadStaffRole(supabase, user.id), getAdminEmails());
  if (!role || !canPerform(role, capability)) redirect("/dashboard");
  return { user, role };
}

/** Content access (owners and editors). Kept for existing call sites. */
export async function requireAdmin(): Promise<User> {
  const { user } = await requireStaff("content");
  return user;
}
