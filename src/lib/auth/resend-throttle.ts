/** Minimum gap between two "send me a new link" emails. */
export const RESEND_COOLDOWN_MS = 2 * 60_000;
/** At most this many confirm links per rolling day. */
export const RESEND_DAILY_LIMIT = 5;

const DAY_MS = 86_400_000;

export type ResendDecision =
  | { allowed: true; history: string[] }
  | { allowed: false; retryInSeconds: number };

/**
 * Whether another confirm-your-email link may go out, given previous send times (ISO strings,
 * kept server-side). An attacker can register someone else's address and press "resend", so
 * this protects that inbox and the email quota.
 */
export function nextResend(previous: readonly unknown[], now: number): ResendDecision {
  const recent = previous
    .map((t) => (typeof t === "string" ? Date.parse(t) : Number.NaN))
    .filter((t) => !Number.isNaN(t) && now - t < DAY_MS)
    .sort((a, b) => b - a);

  const sinceLast = recent.length > 0 ? now - recent[0] : Number.POSITIVE_INFINITY;
  if (sinceLast < RESEND_COOLDOWN_MS) {
    return { allowed: false, retryInSeconds: Math.ceil((RESEND_COOLDOWN_MS - sinceLast) / 1000) };
  }
  if (recent.length >= RESEND_DAILY_LIMIT) {
    const oldest = recent[recent.length - 1];
    return { allowed: false, retryInSeconds: Math.ceil((oldest + DAY_MS - now) / 1000) };
  }
  return { allowed: true, history: [new Date(now).toISOString(), ...recent.map((t) => new Date(t).toISOString())] };
}
