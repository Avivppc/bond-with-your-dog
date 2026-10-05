import "server-only";
import { sendEmail, siteUrl, type OutgoingEmail } from "@/lib/email";
import { createInviteLink, createRecoveryLink, createSignInLink } from "../people/_lib/auth-links";

/**
 * Not a "use server" module on purpose. The links these return sign someone in, so only hand a
 * returned link to staff (behind requireStaff("staff")); everyone else only ever gets it by email.
 */

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

export function staffConfirmEmail(to: string, role: TeamRoleName, link: string): OutgoingEmail {
  return {
    to,
    subject: "Confirm your email to open the Bonded admin",
    text: [
      "Hi,",
      "",
      `You've been invited to the Bonded admin as ${ROLE_NAME[role]}. You already have an account, so there's one step left: confirm this email is yours.`,
      "",
      `Open the admin (this link works once): ${link}`,
      "",
      "If you didn't sign up for Bonded, you can ignore this email.",
    ].join("\n"),
  };
}

/**
 * For an invitee who signed up on their own instead of opening the invite: a one-time link that
 * proves the inbox and lands in the admin, where the invite is claimed. Only ever emailed.
 */
export async function emailStaffConfirmLink(email: string, role: TeamRoleName): Promise<{ ok: true; emailed: boolean } | { ok: false; reason: string }> {
  const created = await createSignInLink(email, "/admin");
  if (!created.ok) return { ok: false, reason: created.reason };
  return { ok: true, emailed: await sendEmail(staffConfirmEmail(email, role, created.link)) };
}
