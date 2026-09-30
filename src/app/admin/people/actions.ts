"use server";

import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { createRecoveryLink, resetEmail } from "./_lib/auth-links";

export interface ResetState {
  status: "idle" | "sent" | "link" | "error";
  message: string;
  /** Only when email isn't set up: a one-time link for staff to pass on. */
  link?: string;
}

const UserId = z.string().uuid();

/**
 * Sends a contact a password-reset link. When email isn't configured, nothing is sent and
 * the one-time link is returned for staff to copy (shown only in the page state, never in a URL).
 */
export async function sendPasswordReset(_prev: ResetState, formData: FormData): Promise<ResetState> {
  await requireStaff("sales");
  const userId = UserId.safeParse(formData.get("user_id"));
  if (!userId.success) return { status: "error", message: "Invalid contact." };

  const { data, error } = await createServiceClient().auth.admin.getUserById(userId.data);
  const email = data.user?.email;
  if (error || !email) {
    console.error("[people] reset: user lookup failed", { userId: userId.data, error: error?.message });
    return { status: "error", message: "Could not find this contact's email." };
  }

  const link = await createRecoveryLink(email);
  if (!link.ok) return { status: "error", message: link.reason };
  const sent = await sendEmail(resetEmail(email, link.link));
  if (sent) return { status: "sent", message: `Password reset email sent to ${email}.` };
  return {
    status: "link",
    message: `Email isn't set up, so nothing was sent. Copy this one-time link and send it to ${email}:`,
    link: link.link,
  };
}
