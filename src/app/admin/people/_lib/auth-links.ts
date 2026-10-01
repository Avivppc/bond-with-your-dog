import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { siteUrl, type OutgoingEmail } from "@/lib/email";

type LinkType = "invite" | "recovery";

/**
 * One-time sign-in links that work on any device: Supabase issues a hashed token and
 * /auth/confirm verifies it (verifyOtp) — no PKCE verifier from the admin's browser needed.
 * They land on /reset-password so the person chooses a password.
 */
function confirmUrl(tokenHash: string, type: LinkType): string {
  const params = new URLSearchParams({ token_hash: tokenHash, type, next: "/reset-password" });
  return `${siteUrl()}/auth/confirm?${params.toString()}`;
}

export type LinkResult = { ok: true; link: string; userId: string } | { ok: false; reason: string };

async function generate(type: LinkType, email: string): Promise<LinkResult> {
  const { data, error } = await createServiceClient().auth.admin.generateLink({ type, email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash || !data.user) {
    console.error(`[people] ${type} link failed`, { email, error: error?.message });
    const exists = error?.message?.toLowerCase().includes("already") ?? false;
    return { ok: false, reason: exists ? "An account with this email already exists." : "Supabase could not create the link." };
  }
  return { ok: true, link: confirmUrl(tokenHash, type), userId: data.user.id };
}

/** Creates the account (unconfirmed until they click) and returns its invitation link. */
export function createInviteLink(email: string): Promise<LinkResult> {
  return generate("invite", email);
}

export function createRecoveryLink(email: string): Promise<LinkResult> {
  return generate("recovery", email);
}

export function inviteEmail(to: string, link: string, offerTitle: string | null): OutgoingEmail {
  return {
    to,
    subject: offerTitle ? `You're invited to ${offerTitle} on Bonded` : "You're invited to Bonded",
    text: [
      "Hi,",
      "",
      offerTitle ? `Roni's team invited you to Bonded and gave you access to ${offerTitle}.` : "Roni's team invited you to Bonded.",
      "",
      `Set your password to get started (this link works once): ${link}`,
      "",
      `Afterwards, sign in any time at ${siteUrl()}/login with this email address.`,
      "",
      "Happy training,",
      "The Bonded team",
    ].join("\n"),
  };
}

export function confirmToUnlockEmail(to: string, link: string, offerTitle: string | null): OutgoingEmail {
  return {
    to,
    subject: offerTitle ? `Confirm your email to unlock ${offerTitle}` : "Confirm your email to unlock your Bonded course",
    text: [
      "Hi,",
      "",
      offerTitle ? `Roni's team gave you access to ${offerTitle} on Bonded.` : "Roni's team gave you access to a Bonded course.",
      "Confirm this is your email address and it unlocks right away (the link works once):",
      link,
      "",
      "Happy training,",
      "The Bonded team",
    ].join("\n"),
  };
}

export function resetEmail(to: string, link: string): OutgoingEmail {
  return {
    to,
    subject: "Reset your Bonded password",
    text: [
      "Hi,",
      "",
      "Roni's team sent you a link to choose a new password for Bonded (it works once):",
      link,
      "",
      "If you didn't ask for this, you can ignore this email.",
      "",
      "The Bonded team",
    ].join("\n"),
  };
}
