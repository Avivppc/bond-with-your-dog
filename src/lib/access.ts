import "server-only";
import type { createClient } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Turns access granted by email (admin "grant by email", Kajabi migration) into
 * enrollments for the signed-in user. Cheap no-op when nothing is pending; never throws.
 */
export async function claimPendingAccess(supabase: ServerSupabase): Promise<void> {
  const { error } = await supabase.rpc("claim_access_invites");
  if (error) console.error("claim_access_invites failed", error.message);
}
