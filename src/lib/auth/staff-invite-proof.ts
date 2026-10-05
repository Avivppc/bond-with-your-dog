import "server-only";
import type { User } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/admin";
import { emailStaffConfirmLink, type TeamRoleName } from "@/app/admin/team/team-invite-email";
import { shouldSendStaffConfirmLink, type ConfirmLinkTrigger } from "./staff-confirm-policy";

type Account = Pick<User, "id" | "email">;

export interface StuckStaffInvite {
  role: TeamRoleName;
}

export type ConfirmLinkOutcome = "sent" | "recently-sent" | "not-needed" | "failed";

/**
 * An admin invite waiting for this account that can't be claimed yet, because the inbox isn't
 * proven (they signed up on their own instead of opening the invite). Null when there is none,
 * or when the inbox is proven (claim_staff_invite then grants it on their next page).
 */
export async function stuckStaffInvite(account: Account): Promise<StuckStaffInvite | null> {
  if (!account.email) return null;
  const sb = createServiceClient();
  const [verified, invite] = await Promise.all([
    sb.rpc("verified_email", { p_uid: account.id }),
    // Invites are stored lower-cased (see inviteToTeam).
    sb.from("staff_invites").select("role").eq("email", account.email.toLowerCase()).is("accepted_at", null).maybeSingle(),
  ]);
  if (verified.error) console.error("[staff-invite] verified_email failed", { userId: account.id, error: verified.error.message });
  if (invite.error) console.error("[staff-invite] invite lookup failed", { userId: account.id, error: invite.error.message });
  if (verified.error || invite.error || typeof verified.data === "string" || !invite.data) return null;
  return { role: invite.data.role as TeamRoleName };
}

/** Emails a link that proves the inbox and opens the admin, at most as often as the policy allows. */
export async function sendStaffConfirmLink(account: Account, trigger: ConfirmLinkTrigger): Promise<ConfirmLinkOutcome> {
  const invite = await stuckStaffInvite(account);
  if (!invite || !account.email) return "not-needed";

  const { data, error } = await createServiceClient().auth.admin.getUserById(account.id);
  if (error) {
    console.error("[staff-invite] user lookup failed", { userId: account.id, error: error.message });
    return "failed";
  }
  if (!shouldSendStaffConfirmLink(data.user?.recovery_sent_at ?? null, trigger, new Date())) return "recently-sent";

  const result = await emailStaffConfirmLink(account.email, invite.role);
  if (!result.ok || !result.emailed) {
    console.error("[staff-invite] confirmation link not sent", { userId: account.id, reason: result.ok ? "email not set up" : result.reason });
    return "failed";
  }
  return "sent";
}
