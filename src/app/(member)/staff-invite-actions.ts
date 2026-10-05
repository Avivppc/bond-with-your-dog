"use server";

import { createClient } from "@/lib/supabase/server";
import { sendStaffConfirmLink } from "@/lib/auth/staff-invite-proof";

export interface StaffLinkState {
  status: "idle" | "sent" | "wait" | "error";
  message: string;
}

const MESSAGES: Record<Exclude<StaffLinkState["status"], "idle">, string> = {
  sent: "Sent. Open the newest email from Bonded and tap the link.",
  wait: "We sent one a moment ago. Check your inbox and spam, or try again in a few minutes.",
  error: "We couldn't send the email. Ask the person who invited you to resend the invite.",
};

/** The member's own "send the admin link again" button. Only ever emails their own address. */
export async function resendStaffConfirmLink(): Promise<StaffLinkState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "Please sign in again." };

  const outcome = await sendStaffConfirmLink(user, "button");
  if (outcome === "sent") return { status: "sent", message: MESSAGES.sent };
  if (outcome === "recently-sent") return { status: "wait", message: MESSAGES.wait };
  if (outcome === "not-needed") return { status: "sent", message: "You're all set. Reload the page to open the admin." };
  return { status: "error", message: MESSAGES.error };
}
