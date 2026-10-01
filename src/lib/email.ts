import "server-only";
import { Resend } from "resend";
import { renderEmailHtml } from "./email-html";

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
  const { error } = await new Resend(apiKey).emails.send({ from, to: email.to, subject: email.subject, text: email.text, html: renderEmailHtml(email, siteUrl()) });
  if (error) {
    console.error("[email] send failed", { to: email.to, subject: email.subject, error: error.message });
    return false;
  }
  return true;
}

const BATCH_LIMIT = 100; // Resend's maximum per batch request

/**
 * Sends many emails in as few requests as possible (Resend batch API, 100 per call), which keeps
 * scheduled jobs under Resend's request rate limit. Returns how many were accepted; 0 when Resend
 * isn't configured.
 */
export async function sendEmailBatch(emails: readonly OutgoingEmail[]): Promise<number> {
  if (emails.length === 0) return 0;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    console.warn("[email] Resend not configured; batch skipped", { count: emails.length });
    return 0;
  }
  const resend = new Resend(apiKey);
  let sent = 0;
  for (let start = 0; start < emails.length; start += BATCH_LIMIT) {
    const chunk = emails.slice(start, start + BATCH_LIMIT).map((e) => ({ from, to: e.to, subject: e.subject, text: e.text, html: renderEmailHtml(e, siteUrl()) }));
    try {
      const { error } = await resend.batch.send(chunk);
      if (error) {
        console.error("[email] batch send failed", { count: chunk.length, error: error.message });
        continue;
      }
      sent += chunk.length;
    } catch (error: unknown) {
      console.error("[email] batch send threw", { count: chunk.length, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return sent;
}

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bonded.dog";
}

export function accessGrantedEmail(to: string, courses: readonly { id: string; title: string }[]): OutgoingEmail {
  const lines = courses.map((c) => `• ${c.title}: ${siteUrl()}/learn/${c.id}`);
  return {
    to,
    subject: courses.length === 1 ? `You're in: ${courses[0].title}` : "Your Bonded chapters are ready",
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
