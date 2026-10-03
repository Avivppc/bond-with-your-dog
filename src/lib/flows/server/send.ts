import "server-only";
import { Resend } from "resend";
import { renderEmailHtml } from "@/lib/email-html";
import { siteUrl } from "@/lib/email";
import { unsubscribeToken } from "../signing";

/** Signs unsubscribe links; falls back to the service key so links work before a dedicated secret is set. */
export function unsubscribeSecret(): string {
  const secret =
    process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("UNSUBSCRIBE_SECRET is not configured");
  return secret;
}

export function unsubscribeUrl(userId: string): string {
  return `${siteUrl()}/unsubscribe?t=${encodeURIComponent(unsubscribeToken(userId, unsubscribeSecret()))}`;
}

export interface MarketingEmail {
  to: string;
  subject: string;
  text: string;
  preheader: string;
  userId: string;
  /** Same key, same email: Resend sends it once even if we ask twice (e.g. after a crash). */
  idempotencyKey?: string;
}

/** `permanent`: retrying won't help (no address, Resend not set up); otherwise try again later. */
export type SendResult =
  | { ok: true; providerId: string | null }
  | { ok: false; error: string; permanent: boolean };

/**
 * Sends a marketing email through Resend and returns its id, which Resend's webhooks use to report
 * delivery, opens and clicks. Every one carries an unsubscribe link and one-click unsubscribe headers.
 */
export async function sendMarketingEmail(
  email: MarketingEmail,
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from)
    return { ok: false, error: "Resend is not configured", permanent: false };
  const unsubscribe = unsubscribeUrl(email.userId);
  const oneClick = unsubscribe.replace("/unsubscribe?", "/api/unsubscribe?");
  try {
    const { data, error } = await new Resend(apiKey).emails.send(
      {
        from,
        to: email.to,
        subject: email.subject,
        text: `${email.text}\n\nUnsubscribe: ${unsubscribe}`,
        html: renderEmailHtml(email, siteUrl(), {
          preheader: email.preheader,
          unsubscribeUrl: unsubscribe,
        }),
        headers: {
          "List-Unsubscribe": `<${oneClick}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      },
      email.idempotencyKey
        ? { idempotencyKey: email.idempotencyKey }
        : undefined,
    );
    if (error) return { ok: false, error: error.message, permanent: false };
    return { ok: true, providerId: data?.id ?? null };
  } catch (error: unknown) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      permanent: false,
    };
  }
}
