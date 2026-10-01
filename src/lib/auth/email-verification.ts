import "server-only";
import type { User } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Proof that a member controls their inbox lives in public.email_verifications (server-written
 * only; migration 20261020000000). Anything granted by email — staff invites, access invites —
 * is claimed only against a proven address, so every link that proves the inbox records it:
 * signup confirmation, password reset, admin invitations and Google sign-in.
 */
export async function markEmailVerified(user: Pick<User, "id" | "email"> | null | undefined): Promise<void> {
  if (!user?.email) return;
  const { error } = await createServiceClient()
    .from("email_verifications")
    .upsert({ user_id: user.id, email: user.email.toLowerCase(), verified_at: new Date().toISOString() });
  if (error) console.error("[verify-email] could not record proof", { userId: user.id, error: error.message });
}
