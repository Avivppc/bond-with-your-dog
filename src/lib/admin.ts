import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { canPerform, resolveStaffRole, type StaffCapability, type StaffRole } from "@/lib/staff";
import { isEmailVerified } from "@/lib/auth/email-verification";

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

/**
 * Bootstrap owners also get a staff_members row, so database policies (draft preview,
 * current_staff_role) treat them as staff — not only the app-level guard.
 */
async function ensureOwnerRow(userId: string): Promise<void> {
  const { error } = await createServiceClient()
    .from("staff_members")
    .upsert({ user_id: userId, role: "owner" }, { onConflict: "user_id" });
  if (error) console.error("could not record bootstrap owner", { userId, error: error.message });
}

export interface StaffSession {
  user: User;
  role: StaffRole;
}

/**
 * Verify the current user is staff with the given capability (default: content).
 * Redirects to /login when signed out and to /home when not permitted.
 */
export async function requireStaff(capability: StaffCapability = "content"): Promise<StaffSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const dbRole = await loadStaffRole(supabase, user.id);
  // Inbox proof, not Supabase's email_confirmed_at: signups are auto-confirmed now.
  const role = resolveStaffRole(user.email, dbRole, getAdminEmails(), await isEmailVerified(supabase));
  if (!role || !canPerform(role, capability)) redirect("/home");
  if (role === "owner" && dbRole !== "owner") await ensureOwnerRow(user.id);
  return { user, role };
}

/** Content access (owners and editors). Kept for existing call sites. */
export async function requireAdmin(): Promise<User> {
  const { user } = await requireStaff("content");
  return user;
}
