import "server-only";
import type { createServiceClient } from "@/lib/supabase/admin";
import { sendEmail, siteUrl } from "@/lib/email";
import { readNotifPrefs } from "./prefs";
import type { EmailOutcome } from "./email-outcome";

type Service = ReturnType<typeof createServiceClient>;

/** True when transactional email is configured (RESEND_API_KEY + EMAIL_FROM). */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Emails a member about Roni's feedback, unless they switched "Feedback from Roni" off in
 * Settings. Reports what happened so the Studio can say it honestly.
 */
export async function notifyMemberByEmail(sb: Service, userId: string, message: { subject: string; lead: string; path: string }): Promise<EmailOutcome> {
  if (!isEmailConfigured()) return "not_configured";
  const [{ data: profile }, { data: account, error }] = await Promise.all([
    sb.from("profiles").select("full_name, notif_prefs").eq("id", userId).maybeSingle(),
    sb.auth.admin.getUserById(userId),
  ]);
  if (error || !account.user?.email) {
    console.error("[feedback] member email lookup failed", { userId, error: error?.message });
    return "failed";
  }
  if (!readNotifPrefs(profile?.notif_prefs).feedback) return "opted_out";
  const first = ((profile?.full_name as string | null) ?? "").trim().split(/\s+/)[0] || "there";
  const sent = await sendEmail({
    to: account.user.email,
    subject: message.subject,
    text: [
      `Hi ${first},`,
      "",
      message.lead,
      "",
      `Open it here: ${siteUrl()}${message.path}`,
      "",
      "You can turn these emails off in Settings.",
      "",
      "Happy training,",
      "Roni and the Bonded team",
    ].join("\n"),
  });
  return sent ? "sent" : "failed";
}
