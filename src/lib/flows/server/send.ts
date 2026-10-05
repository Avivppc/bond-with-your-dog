import "server-only";
import { Resend } from "resend";
import { siteUrl } from "@/lib/email";
import { batchOutcomes, isPermanentSendError, type BatchItemOutcome } from "../send-errors";
import { fromWithName } from "../sender";
import { unsubscribeToken, unsubscribeTokenForEmail } from "../signing";

/** Signs unsubscribe links; falls back to the service key so links work before a dedicated secret is set. */
export function unsubscribeSecret(): string {
  const secret = process.env.UNSUBSCRIBE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("UNSUBSCRIBE_SECRET is not configured");
  return secret;
}

export interface UnsubscribeLinks {
  /** The page in the email footer (asks to confirm). */
  page: string;
  /** RFC 8058 one-click address for the List-Unsubscribe header. */
  oneClick: string;
}

/** Unsubscribe links for a member (by account) or a lead (by address). */
export function unsubscribeLinks(recipient: { userId: string | null; email: string }): UnsubscribeLinks {
  const secret = unsubscribeSecret();
  const token = recipient.userId ? unsubscribeToken(recipient.userId, secret) : unsubscribeTokenForEmail(recipient.email, secret);
  const query = `?t=${encodeURIComponent(token)}`;
  return { page: `${siteUrl()}/unsubscribe${query}`, oneClick: `${siteUrl()}/api/unsubscribe${query}` };
}

export interface MarketingEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribe: UnsubscribeLinks;
  /** Same key, same email: Resend sends it once even if we ask twice (e.g. after a crash). */
  idempotencyKey?: string;
  /** Settings → Email: the sender's display name and where replies go. */
  sender?: { name: string; replyTo: string | null };
}

/** `permanent`: retrying won't help; otherwise try again on the next run. */
export type SendResult = { ok: true; providerId: string | null } | { ok: false; error: string; permanent: boolean };

function resendConfig(): { apiKey: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  return apiKey && from ? { apiKey, from } : null;
}

const payload = (from: string, email: MarketingEmail) => ({
  from: email.sender ? fromWithName(from, email.sender.name) : from,
  ...(email.sender?.replyTo ? { replyTo: email.sender.replyTo } : {}),
  to: email.to,
  subject: email.subject,
  html: email.html,
  text: email.text,
  headers: { "List-Unsubscribe": `<${email.unsubscribe.oneClick}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
});

/**
 * Sends one marketing email (already rendered, unsubscribe link included) through Resend and returns
 * its id, which Resend's webhooks use to report delivery, opens and clicks.
 */
export async function sendMarketingEmail(email: MarketingEmail): Promise<SendResult> {
  const config = resendConfig();
  if (!config) return { ok: false, error: "Resend is not configured", permanent: false };
  try {
    const { data, error } = await new Resend(config.apiKey).emails.send(payload(config.from, email), email.idempotencyKey ? { idempotencyKey: email.idempotencyKey } : undefined);
    if (error) return { ok: false, error: error.message, permanent: isPermanentSendError(error.name) };
    return { ok: true, providerId: data?.id ?? null };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), permanent: false };
  }
}

export type BatchResult = { ok: true; items: BatchItemOutcome[] } | { ok: false; error: string };

/**
 * Up to 100 emails in one Resend request (campaigns). Permissive: a bad address is rejected on its
 * own and the rest still go out. `ok: false` means nothing was sent, so the same batch can be retried
 * with the same idempotency key.
 */
export async function sendMarketingBatch(emails: readonly MarketingEmail[], idempotencyKey: string): Promise<BatchResult> {
  const config = resendConfig();
  if (!config) return { ok: false, error: "Resend is not configured" };
  try {
    const { data, error } = await new Resend(config.apiKey).batch.send(
      emails.map((e) => payload(config.from, e)),
      { idempotencyKey, batchValidation: "permissive" },
    );
    if (error || !data) return { ok: false, error: error?.message ?? "Resend sent no response" };
    return { ok: true, items: batchOutcomes(emails.length, data.data ?? [], data.errors ?? []) };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
