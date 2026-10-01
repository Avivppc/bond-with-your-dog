"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { notifyAccessGranted } from "@/lib/payments/billing";
import { sendEmail, siteUrl } from "@/lib/email";
import { DaysOfAccess } from "@/lib/admin-helpers/form-fields";
import { findAccount, grantOffer, holdUntilVerified, saveAccessInvite } from "../people/_lib/access-server";

/** Where these forms live now: the Contacts list or one contact's page. */
const ReturnTo = z
  .string()
  .regex(/^\/admin\/people(\/[0-9a-f-]{36}|\/add)?$/)
  .catch("/admin/people");

function back(returnTo: string, params: Record<string, string>): never {
  redirect(`${returnTo}?${new URLSearchParams(params).toString()}`);
}

function revalidateContacts(): void {
  revalidatePath("/admin/people", "layout");
}

const GrantSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  offer_id: z.string().uuid("Choose an offer"),
  days: DaysOfAccess,
});

function signupInvite(email: string) {
  return {
    to: email,
    subject: "You've been given access to Bonded",
    text: [
      "Hi,",
      "",
      "You've been given access to a Bonded course.",
      `Create your account with this email address at ${siteUrl()}/signup, then confirm your email from the welcome message. Your course will be waiting for you.`,
      "",
      "The Bonded team",
    ].join("\n"),
  };
}

/**
 * Grants an offer to an email. Verified accounts get access now; otherwise the grant waits
 * in access_invites and is claimed once the owner of that email has confirmed it.
 */
export async function grantAccessByEmail(formData: FormData): Promise<void> {
  const { user: staff } = await requireStaff("sales");
  const returnTo = ReturnTo.parse(formData.get("return_to"));
  const parsed = GrantSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back(returnTo, { error: parsed.error.issues[0].message });
  const { email, offer_id: offerId, days } = parsed.data;

  let account: Awaited<ReturnType<typeof findAccount>>;
  try {
    account = await findAccount(email);
  } catch (error: unknown) {
    console.error("[students] user lookup failed", { email, error: error instanceof Error ? error.message : error });
    back(returnTo, { error: "Could not look up that email." });
  }

  if (account && !account.verified) {
    const held = await holdUntilVerified(email, { offerId, offerTitle: null, days, staffId: staff.id });
    if (!held.saved) back(returnTo, { error: "Could not save the invitation." });
    revalidateContacts();
    back(
      returnTo,
      held.emailed
        ? { ok: `${email} hasn't confirmed their email yet. We sent them a link; access unlocks once they confirm.` }
        : {
            error: `${email} hasn't confirmed their email yet. Access is saved, but the confirm email could not be sent. Ask them to sign in and press “Send me a new link” on their Home page.`,
          }
    );
  }

  if (account) {
    const grantError = await grantOffer(account.userId, offerId, days);
    if (grantError) back(returnTo, { error: grantError });
    await notifyAccessGranted(account.userId, offerId);
    revalidateContacts();
    back(returnTo, { ok: `Access granted to ${email}.` });
  }

  const saved = await saveAccessInvite(email, { offerId, offerTitle: null, days, staffId: staff.id });
  if (saved === "failed") back(returnTo, { error: "Could not save the invitation." });
  const emailed = await sendEmail(signupInvite(email));
  revalidateContacts();
  back(
    returnTo,
    emailed
      ? { ok: `${email} doesn't have an account yet. We emailed them; access unlocks when they sign up with this email.` }
      : {
          error: `${email} doesn't have an account yet. Access is saved and unlocks when they sign up with this email, but the invitation email could not be sent (email isn't set up). Ask them to sign up at ${siteUrl()}/signup.`,
        }
  );
}

const RevokeSchema = z.object({ user_id: z.string().uuid(), course_id: z.string().min(1).max(100) });

/** Ends a student's access to one course now (keeps their progress for a later re-grant). */
export async function revokeCourseAccess(formData: FormData): Promise<void> {
  await requireStaff("sales");
  const returnTo = ReturnTo.parse(formData.get("return_to"));
  const parsed = RevokeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back(returnTo, { error: "Invalid request." });
  const { error } = await createServiceClient().rpc("revoke_course_access", {
    p_user_id: parsed.data.user_id,
    p_course_id: parsed.data.course_id,
  });
  if (error) {
    console.error("[students] revoke failed", { ...parsed.data, error: error.message });
    back(returnTo, { error: "Could not revoke access." });
  }
  revalidateContacts();
  back(returnTo, { ok: "Access revoked." });
}

const RevokeInviteSchema = z.object({ id: z.string().uuid() });

export async function cancelAccessInvite(formData: FormData): Promise<void> {
  await requireStaff("sales");
  const returnTo = ReturnTo.parse(formData.get("return_to"));
  const parsed = RevokeInviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) back(returnTo, { error: "Invalid request." });
  const { error } = await createServiceClient().from("access_invites").delete().eq("id", parsed.data.id).is("claimed_at", null);
  if (error) {
    console.error("[students] cancel invite failed", { id: parsed.data.id, error: error.message });
    back(returnTo, { error: "Could not cancel the invitation." });
  }
  revalidateContacts();
  back(returnTo, { ok: "Invitation canceled." });
}
