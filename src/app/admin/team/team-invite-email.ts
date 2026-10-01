import "server-only";
import { sendEmail, siteUrl, type OutgoingEmail } from "@/lib/email";
import { createInviteLink, createRecoveryLink } from "../people/_lib/auth-links";

/** Not a "use server" module on purpose: these helpers must only run behind requireStaff("staff"). */

export type TeamRoleName = "owner" | "editor";

const ROLE_NAME: Record<TeamRoleName, string> = { owner: "an owner", editor: "a content editor" };

export function staffInviteEmail(to: string, role: TeamRoleName, link: string, inviter: string | undefined): OutgoingEmail {
  return {
    to,
    subject: "You've been invited to manage the Bonded academy",
    text: [
      "Hi,",
      "",
      `${inviter ?? "The Bonded team"} invited you to the Bonded admin as ${ROLE_NAME[role]}.`,
      "",
      `Choose your password to get in (this link works once): ${link}`,
      "",
      `Afterwards, sign in any time at ${siteUrl()}/login with this email address.`,
    ].join("\n"),
  };
}

export type TeamLinkResult = { ok: true; link: string; emailed: boolean } | { ok: false; reason: string };

/**
 * A one-time link into the admin for an invitee: "choose your password" for someone new, a password
 * link (opening it proves the inbox) for an existing but unproven account. Emailed when Resend is
 * set up; the link is returned either way so the caller can show it when it wasn't.
 */
export async function issueTeamInviteLink(email: string, role: TeamRoleName, hasAccount: boolean, inviter: string | undefined): Promise<TeamLinkResult> {
  const created = hasAccount ? await createRecoveryLink(email) : await createInviteLink(email);
  if (!created.ok) return { ok: false, reason: created.reason };
  const emailed = await sendEmail(staffInviteEmail(email, role, created.link, inviter));
  return { ok: true, link: created.link, emailed };
}
