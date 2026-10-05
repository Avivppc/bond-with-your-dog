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

const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(payload).digest("base64url").slice(0, 32);

/** "<userId>.<signature>": a link that unsubscribes exactly this member and can't be guessed for another. */
export function unsubscribeToken(userId: string, secret: string): string {
  return `${userId}.${sign(`unsubscribe:${userId}`, secret)}`;
}

/** "e.<address>.<signature>": the same for someone without an account (a quiz lead). */
export function unsubscribeTokenForEmail(email: string, secret: string): string {
  const address = email.trim().toLowerCase();
  return `e.${Buffer.from(address).toString("base64url")}.${sign(`unsubscribe-email:${address}`, secret)}`;
}

export type UnsubscribeSubject = { userId: string } | { email: string };

/** Who a valid unsubscribe token belongs to, or null. */
export function readUnsubscribeToken(token: string, secret: string): UnsubscribeSubject | null {
  if (token.startsWith("e.")) {
    const [, encoded = ""] = token.split(".");
    const email = Buffer.from(encoded, "base64url").toString("utf8");
    if (!/^[^\s@]+@[^\s@]+$/.test(email)) return null;
    return safeEqual(token, unsubscribeTokenForEmail(email, secret)) ? { email } : null;
  }
  const userId = token.split(".")[0] ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null;
  return safeEqual(token, unsubscribeToken(userId, secret)) ? { userId } : null;
}
