import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { readUnsubscribeToken } from "../signing";
import { unsubscribeSecret } from "./send";

/** Applies an unsubscribe link: stops flow emails for that member. Returns false for a bad token. */
export async function unsubscribeByToken(token: string, source: "link" | "one_click"): Promise<boolean> {
  const userId = readUnsubscribeToken(token, unsubscribeSecret());
  if (!userId) return false;
  const sb = createServiceClient();
  const { data } = await sb.auth.admin.getUserById(userId);
  const { error } = await sb.from("email_unsubscribes").upsert({ user_id: userId, email: data.user?.email ?? null, source }, { onConflict: "user_id", ignoreDuplicates: true });
  if (error) {
    console.error("[unsubscribe] failed", { error: error.message });
    return false;
  }
  return true;
}

export async function resubscribeByToken(token: string): Promise<boolean> {
  const userId = readUnsubscribeToken(token, unsubscribeSecret());
  if (!userId) return false;
  const { error } = await createServiceClient().from("email_unsubscribes").delete().eq("user_id", userId);
  if (error) console.error("[unsubscribe] resubscribe failed", { error: error.message });
  return !error;
}
