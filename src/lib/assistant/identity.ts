import { createHash, randomUUID } from "node:crypto";

/** Anonymous visitor identity for sales chats: a random cookie id and a salted IP hash (server code). */

export const VISITOR_COOKIE = "bonded_aid";
export const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const VISITOR_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The cookie's id if it's one we issued, else null (a new one is issued). */
export function validVisitorId(value: string | null | undefined): string | null {
  return value && VISITOR_ID.test(value) ? value : null;
}

export function newVisitorId(): string {
  return randomUUID();
}

/**
 * sha256 of the IP with a server secret, so raw IPs are never stored. Requests without an IP
 * share one bucket rather than escaping the limit.
 */
export function hashIp(ip: string | null, salt: string): string {
  return createHash("sha256").update(`${salt}:${ip ?? "unknown"}`).digest("hex");
}

export function ipSalt(env: Readonly<Record<string, string | undefined>> = process.env): string {
  const salt = env.ASSISTANT_SALT?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!salt) throw new Error("ASSISTANT_SALT (or SUPABASE_SERVICE_ROLE_KEY) not configured");
  return salt;
}

/** A same-site path to store with the conversation (no query string, no other origins). */
export function cleanPage(page: string | null | undefined): string | null {
  if (!page || !page.startsWith("/") || page.startsWith("//")) return null;
  return page.split(/[?#]/)[0].slice(0, 300) || null;
}
