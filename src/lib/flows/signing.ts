import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signatures for the email side of flows: verifying Resend's webhooks (Svix format) and signing the
 * unsubscribe links we put in every flow email.
 */

/** Resend retries for a while; anything older than this is a replay. */
const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export interface WebhookHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

/** True when the body really came from Resend: HMAC-SHA256 over "id.timestamp.body" with the whsec_ secret. */
export function verifyResendWebhook(secret: string, headers: WebhookHeaders, body: string, now: Date): boolean {
  const { id, timestamp, signature } = headers;
  if (!secret.startsWith("whsec_") || !id || !timestamp || !signature) return false;
  const sent = Number(timestamp);
  if (!Number.isFinite(sent) || Math.abs(now.getTime() / 1000 - sent) > WEBHOOK_TOLERANCE_SECONDS) return false;
  const key = Buffer.from(secret.slice("whsec_".length), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  return signature.split(" ").some((part) => {
    const [version, value] = part.split(",");
    return version === "v1" && value !== undefined && safeEqual(value, expected);
  });
}

/** "<userId>.<signature>": a link that unsubscribes exactly this member and can't be guessed for another. */
export function unsubscribeToken(userId: string, secret: string): string {
  const sig = createHmac("sha256", secret).update(`unsubscribe:${userId}`).digest("base64url").slice(0, 32);
  return `${userId}.${sig}`;
}

/** The member a valid unsubscribe token belongs to, or null. */
export function readUnsubscribeToken(token: string, secret: string): string | null {
  const userId = token.split(".")[0] ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null;
  return safeEqual(token, unsubscribeToken(userId, secret)) ? userId : null;
}
