import { createClient as createSbClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS — only use in server code that has already
 * verified the caller is an admin via requireAdmin().
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured");
  return createSbClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
