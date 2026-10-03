import "server-only";

/**
 * Cloudflare Turnstile: proves a public form was filled in by a person. Forms send the widget's
 * token as `cf-turnstile-response`. Until TURNSTILE_SECRET_KEY is set (local development, or before
 * the keys exist) every check passes, so forms keep working.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const TURNSTILE_FIELD = "cf-turnstile-response";
const TIMEOUT_MS = 5_000;

export function turnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstile(token: string | null | undefined, remoteIp?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token || token.length > 2048) return false;
  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp) body.set("remoteip", remoteIp);
    const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) {
      console.error("[turnstile] verify failed", { status: res.status });
      return false;
    }
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) console.warn("[turnstile] rejected", { codes: data["error-codes"] });
    return data.success === true;
  } catch (error: unknown) {
    console.error("[turnstile] verify error", { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/** The visitor's IP as Vercel passes it (first hop of x-forwarded-for). */
export function clientIp(headers: Headers): string | null {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || null;
}
