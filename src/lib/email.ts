import "server-only";
import { Resend } from "resend";
import { renderEmailHtml } from "./email-html";
import { createServiceClient } from "@/lib/supabase/admin";
import { DEFAULT_ART_SETTINGS, artForAudience, type EmailArtSettings, type EmailAudience } from "./email-art";
import { loadEmailSettings } from "@/lib/flows/server/email-settings";

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  /** Who it is for, which decides the picture on top (Settings → Email). Default: "system", a one-off email. */
  audience?: EmailAudience;
}

/** The picture settings; a failed lookup only means the defaults, never a missing email. */
async function loadArtSettings(): Promise<EmailArtSettings> {
  try {
    return (await loadEmailSettings(createServiceClient())).emailArt;
  } catch (error: unknown) {
    console.error("[email] picture settings unavailable, using defaults", { error: error instanceof Error ? error.message : String(error) });
    return DEFAULT_ART_SETTINGS;
  }
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
  const { error } = await new Resend(apiKey).emails.send({ from, to: email.to, subject: email.subject, text: email.text, html: renderEmailHtml(email, siteUrl(), { art: artForAudience(email.audience, await loadArtSettings()) }) });
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
  const artSettings = await loadArtSettings();
  let sent = 0;
  for (let start = 0; start < emails.length; start += BATCH_LIMIT) {
    const chunk = emails.slice(start, start + BATCH_LIMIT).map((e) => ({ from, to: e.to, subject: e.subject, text: e.text, html: renderEmailHtml(e, siteUrl(), { art: artForAudience(e.audience, artSettings) }) }));
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
