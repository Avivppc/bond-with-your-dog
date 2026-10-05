/**
 * When to email an admin invitee a fresh "confirm your email" link. Pure, so the rules are tested.
 *
 * Someone who signed up on their own instead of opening their admin invite has an unproven inbox,
 * so the invite can't be claimed until they open a link we email them. We send one automatically
 * the first time they sign in or sign up; after that only on request (the member app's
 * "Send the link again" button).
 *
 * Anyone can sign up with someone else's address (signup doesn't confirm email), so without a
 * limit a stranger could fill the real owner's inbox by signing in over and over.
 */

/** What asked for the link: an automatic send on sign-in/sign-up, or the member pressing the button. */
export type ConfirmLinkTrigger = "sign-in" | "button";

/** A press of the button sends a fresh link, but not twice within this window (double clicks, scripted spam). */
const BUTTON_COOLDOWN_MS = 60 * 1000;

/**
 * Sign-in sends one link automatically, only when none was ever sent; after that a new link goes
 * out only when someone asks for it (the member's button, or "Resend invite" in the admin).
 *
 * @param lastSentAt when Supabase last issued a sign-in link to this account (auth.users.recovery_sent_at), or null
 * @param trigger    what is asking for the link
 * @param now        the current time (passed in so tests control it)
 */
export function shouldSendStaffConfirmLink(lastSentAt: string | null, trigger: ConfirmLinkTrigger, now: Date): boolean {
  if (lastSentAt === null) return true;
  if (trigger === "sign-in") return false;
  const sentAt = Date.parse(lastSentAt);
  return Number.isNaN(sentAt) || now.getTime() - sentAt >= BUTTON_COOLDOWN_MS;
}
