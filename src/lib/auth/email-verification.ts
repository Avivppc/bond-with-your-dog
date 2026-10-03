import "server-only";
import { randomBytes } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import { hasPasswordIdentity } from "./google-identity";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Signup logs members in straight away, so Supabase's email_confirmed_at proves nothing.
 * Inbox proof lives in public.email_verifications (server-written only) and is what
 * unlocks anything granted by email: staff invites, access invites, admin grants.
 */

const VERIFIED_DESTINATION = "/home?verified=1";

/** One-time link that proves the inbox; /auth/confirm verifies it and records the proof. */
export async function createVerifyLink(email: string, baseUrl: string): Promise<string | null> {
  try {
    const { data, error } = await createServiceClient().auth.admin.generateLink({ type: "magiclink", email });
    const tokenHash = data?.properties?.hashed_token;
    if (error || !tokenHash) {
      console.error("[verify-email] link failed", { email, error: error?.message });
      return null;
    }
    const params = new URLSearchParams({ token_hash: tokenHash, type: "magiclink", next: VERIFIED_DESTINATION });
    return `${baseUrl}/auth/confirm?${params.toString()}`;
  } catch (error: unknown) {
    console.error("[verify-email] link failed", { email, error: error instanceof Error ? error.message : error });
    return null;
  }
}

/** Records that this member controls their current email address. */
export async function markEmailVerified(user: Pick<User, "id" | "email"> | null | undefined): Promise<void> {
  if (!user?.email) return;
  const { error } = await createServiceClient()
    .from("email_verifications")
    .upsert({ user_id: user.id, email: user.email.toLowerCase(), verified_at: new Date().toISOString() });
  if (error) console.error("[verify-email] could not record proof", { userId: user.id, error: error.message });
}

/** Whether the signed-in member has proven their current email. */
export async function isEmailVerified(supabase: ServerSupabase): Promise<boolean> {
  const { data, error } = await supabase.rpc("my_email_verified");
  if (error) {
    console.error("[verify-email] check failed", error.message);
    return false;
  }
  return data === true;
}

/**
 * The inbox owner just proved the address. If the account also has a password set before
 * anyone proved the inbox, someone else may have registered this address and know that
 * password, so it is replaced and every other session is signed out. Returns true when the
 * password was replaced (the owner then needs to choose one, unless they use Google).
 */
export async function secureUnprovenAccount(supabase: ServerSupabase, user: User): Promise<boolean> {
  if (!hasPasswordIdentity(user) || (await isEmailVerified(supabase))) return false;
  const { error } = await createServiceClient().auth.admin.updateUserById(user.id, {
    password: randomBytes(32).toString("base64url"),
  });
  if (error) console.error("[verify-email] could not replace unproven password", { userId: user.id, error: error.message });
  const { error: signOutError } = await supabase.auth.signOut({ scope: "others" });
  if (signOutError) console.error("[verify-email] sign-out of other sessions failed", signOutError.message);
  return !error;
}

/** Google proved the address: secure the account, then record the proof. */
export async function claimAccountViaGoogle(supabase: ServerSupabase, user: User): Promise<void> {
  await secureUnprovenAccount(supabase, user);
  await markEmailVerified(user);
}
