import "server-only";
import { Resend } from "resend";

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
}

/**
 * Sends a transactional email via Resend. When RESEND_API_KEY / EMAIL_FROM are not
 * configured (local dev), logs and returns false instead of failing the caller.
 */
export async function sendEmail(email: OutgoingEmail): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn("[email] Resend not configured; skipped", { to: email.to, subject: email.subject });
    return false;
  }
  const { error } = await new Resend(apiKey).emails.send({ from, to: email.to, subject: email.subject, text: email.text });
  if (error) {
    console.error("[email] send failed", { to: email.to, subject: email.subject, error: error.message });
    return false;
  }
  return true;
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bonded.dog";
}

export function accessGrantedEmail(to: string, courses: readonly { id: string; title: string }[]): OutgoingEmail {
  const lines = courses.map((c) => `• ${c.title}: ${siteUrl()}/learn/${c.id}`);
  return {
    to,
    subject: courses.length === 1 ? `You're in: ${courses[0].title}` : "Your Bonded courses are ready",
    text: [
      "Welcome to Bonded!",
      "",
      "You now have access to:",
      ...lines,
      "",
      `Sign in any time at ${siteUrl()}/login with this email address.`,
      "",
      "Happy training,",
      "The Bonded team",
    ].join("\n"),
  };
}
