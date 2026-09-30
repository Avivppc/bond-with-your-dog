import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { notifyAccessGranted } from "@/lib/payments/billing";
import { sendEmail } from "@/lib/email";
import { createInviteLink, inviteEmail } from "./auth-links";

const DAY_MS = 86_400_000;

export interface AccessOptions {
  offerId: string | null;
  offerTitle: string | null;
  days: number | null;
  staffId: string;
}

export type ContactOutcome =
  | { email: string; status: "granted" }
  | { email: string; status: "exists" }
  | { email: string; status: "pending" }
  | { email: string; status: "already_invited" }
  | { email: string; status: "invited"; emailed: boolean; link: string | null }
  | { email: string; status: "failed"; reason: string };

/** The account for an email, or null. Throws when the lookup itself fails. */
export async function findUserId(email: string): Promise<string | null> {
  const { data, error } = await createServiceClient().rpc("find_user_id_by_email", { p_email: email });
  if (error) throw new Error(`lookup failed: ${error.message}`);
  return typeof data === "string" ? data : null;
}

/** Grants an offer to an account now (optionally for `days`). Returns an error message or null. */
export async function grantOffer(userId: string, offerId: string, days: number | null): Promise<string | null> {
  const { error } = await createServiceClient().rpc("grant_offer_access", {
    p_user_id: userId,
    p_offer_id: offerId,
    p_source: "grant",
    p_order_id: null,
    p_expires_at: days ? new Date(Date.now() + days * DAY_MS).toISOString() : null,
  });
  if (error) {
    console.error("[people] grant failed", { userId, offerId, error: error.message });
    return "Could not grant access.";
  }
  return null;
}

/** Saves an offer for an email without an account; it's claimed when they sign up. */
export async function saveAccessInvite(email: string, opts: AccessOptions): Promise<"saved" | "exists" | "failed"> {
  const { error } = await createServiceClient()
    .from("access_invites")
    .insert({ email, offer_id: opts.offerId, days_of_access: opts.days, invited_by: opts.staffId });
  if (!error) return "saved";
  if (error.code === "23505") return "exists";
  console.error("[people] access invite failed", { email, error: error.message });
  return "failed";
}

async function inviteNewPerson(email: string, opts: AccessOptions): Promise<ContactOutcome> {
  const invite = await createInviteLink(email);
  if (!invite.ok) return { email, status: "failed", reason: invite.reason };
  if (opts.offerId) {
    const grantError = await grantOffer(invite.userId, opts.offerId, opts.days);
    if (grantError) return { email, status: "failed", reason: `Account created, but ${grantError.toLowerCase()}` };
  }
  const emailed = await sendEmail(inviteEmail(email, invite.link, opts.offerTitle));
  return { email, status: "invited", emailed, link: emailed ? null : invite.link };
}

/**
 * Kajabi's "Add contacts" for one email:
 *  - existing account → grant the offer now (or nothing to do without one)
 *  - no account + invite → create the account with a one-time link (email it, or hand it back)
 *  - no account, no invite → keep the offer waiting in access_invites for their sign-up
 */
export async function addContact(email: string, opts: AccessOptions & { sendInvite: boolean }): Promise<ContactOutcome> {
  try {
    const userId = await findUserId(email);
    if (userId) {
      if (!opts.offerId) return { email, status: "exists" };
      const grantError = await grantOffer(userId, opts.offerId, opts.days);
      if (grantError) return { email, status: "failed", reason: grantError };
      await notifyAccessGranted(userId, opts.offerId);
      return { email, status: "granted" };
    }
    if (opts.sendInvite) return await inviteNewPerson(email, opts);
    if (!opts.offerId) return { email, status: "failed", reason: "No account yet. Choose an offer or tick “Send invitation email”." };
    const saved = await saveAccessInvite(email, opts);
    if (saved === "failed") return { email, status: "failed", reason: "Could not save the invitation." };
    return { email, status: saved === "exists" ? "already_invited" : "pending" };
  } catch (error: unknown) {
    console.error("[people] add contact failed", { email, error: error instanceof Error ? error.message : error });
    return { email, status: "failed", reason: "Something went wrong looking up this email." };
  }
}
