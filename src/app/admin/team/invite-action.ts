"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmail, siteUrl, type OutgoingEmail } from "@/lib/email";
import { createInviteLink, createRecoveryLink } from "../people/_lib/auth-links";

export interface TeamInviteState {
  status: "idle" | "done" | "error";
  message: string;
  /** One-time link to hand over yourself when email isn't set up. */
  link: string | null;
  email: string;
}

const InviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  role: z.enum(["editor", "owner"]),
});

const ROLE_NAME = { owner: "an owner", editor: "a content editor" } as const;

function staffInviteEmail(to: string, role: "owner" | "editor", link: string, inviter: string | undefined): OutgoingEmail {
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

const fail = (email: string, message: string): TeamInviteState => ({ status: "error", message, link: null, email });

/**
 * Invites someone to the admin. Their role waits in staff_invites and is claimed once they've
 * proven the inbox: new people get an account with a one-time "choose your password" link; people
 * with an unproven account get a password link (opening it proves the inbox); people whose email
 * is already proven get access right away. Without email set up, the link is handed back here.
 */
export async function inviteToTeam(_prev: TeamInviteState, formData: FormData): Promise<TeamInviteState> {
  const { user } = await requireStaff("staff");
  const parsed = InviteSchema.safeParse({ email: formData.get("email"), role: formData.get("role") });
  if (!parsed.success) return fail(String(formData.get("email") ?? ""), parsed.error.issues[0].message);
  const { email, role } = parsed.data;

  const sb = createServiceClient();
  const { data: account, error: lookupError } = await sb.rpc("find_account_by_email", { p_email: email }).maybeSingle<{ user_id: string; verified: boolean }>();
  if (lookupError) {
    console.error("[team] account lookup failed", { email, error: lookupError.message });
    return fail(email, "Could not look up this email. Please try again.");
  }
  if (account) {
    const { data: existing } = await sb.from("staff_members").select("role").eq("user_id", account.user_id).maybeSingle();
    if (existing) return fail(email, `${email} already has access. Change their role in the list below.`);
  }

  if (account?.verified) {
    const { error } = await sb.from("staff_members").insert({ user_id: account.user_id, role, invited_by: user.id });
    if (error) {
      console.error("[team] direct grant failed", { email, error: error.message });
      return fail(email, "Could not give access. Please try again.");
    }
    revalidatePath("/admin/team");
    return { status: "done", message: `${email} has access now — they'll see the admin next time they sign in.`, link: null, email };
  }

  // One pending invite per email (unique on lower(email)): re-inviting updates the role.
  const { data: pending } = await sb.from("staff_invites").select("id").eq("email", email).is("accepted_at", null).maybeSingle();
  const { error: inviteError } = pending
    ? await sb.from("staff_invites").update({ role, invited_by: user.id }).eq("id", pending.id)
    : await sb.from("staff_invites").insert({ email, role, invited_by: user.id });
  if (inviteError) {
    console.error("[team] invite save failed", { email, error: inviteError.message });
    return fail(email, "Could not save the invite.");
  }
  const created = account ? await createRecoveryLink(email) : await createInviteLink(email);
  revalidatePath("/admin/team");
  if (!created.ok) return fail(email, `Invite saved, but ${created.reason.toLowerCase()} Try again in a minute.`);

  const emailed = await sendEmail(staffInviteEmail(email, role, created.link, user.email));
  return emailed
    ? { status: "done", message: `Invite sent to ${email}.`, link: null, email }
    : { status: "done", message: `Invite saved. Email isn't set up yet, so send ${email} this one-time link yourself:`, link: created.link, email };
}
