import "server-only";
import { createClient } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/** The member's own Supabase client (RLS applies) plus their user id, or null when signed out. */
export async function memberClient(): Promise<{ supabase: ServerSupabase; userId: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { supabase, userId: user.id } : null;
}
