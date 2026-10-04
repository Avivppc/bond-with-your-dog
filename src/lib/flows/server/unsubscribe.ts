import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { exactLike } from "../like";
import { readUnsubscribeToken } from "../signing";
import { unsubscribeSecret } from "./send";

/** Applies an unsubscribe link (member or quiz lead): stops flow and campaign emails. False for a bad token. */
export async function unsubscribeByToken(token: string, source: "link" | "one_click"): Promise<boolean> {
  const subject = readUnsubscribeToken(token, unsubscribeSecret());
  if (!subject) return false;
  const sb = createServiceClient();
  const userId = "userId" in subject ? subject.userId : null;
  const email = "email" in subject ? subject.email : ((await sb.auth.admin.getUserById(subject.userId)).data.user?.email ?? null);
  const { data: already } = await sb.rpc("is_unsubscribed", { p_user_id: userId, p_email: email });
  if (already) return true;
  const { error } = await sb.from("email_unsubscribes").insert({ user_id: userId, email, source });
  if (error && error.code !== "23505") {
    console.error("[unsubscribe] failed", { error: error.message });
    return false;
  }
  // A member's unsubscribe is also a withdrawal of marketing consent: Settings must show it off and
  // the consent proof must go (the profiles trigger clears it). The unsubscribe itself already holds.
  if (userId) {
    const { error: consentError } = await sb.from("profiles").update({ marketing_opt_in: false }).eq("id", userId);
    if (consentError) console.error("[unsubscribe] consent was not cleared", { error: consentError.message });
  }
  return true;
}

export async function resubscribeByToken(token: string): Promise<boolean> {
  const subject = readUnsubscribeToken(token, unsubscribeSecret());
  if (!subject) return false;
  const sb = createServiceClient();
  const query = "userId" in subject ? sb.from("email_unsubscribes").delete().eq("user_id", subject.userId) : sb.from("email_unsubscribes").delete().ilike("email", exactLike(subject.email));
  const { error } = await query;
  if (error) console.error("[unsubscribe] resubscribe failed", { error: error.message });
  return !error;
}
