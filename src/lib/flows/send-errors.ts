/**
 * How the email job reads Resend's answers. Pure, so it's tested without a network.
 */

/**
 * Errors about the email itself (a malformed address, a missing field): sending it again can't work,
 * so the step is skipped. Everything else (rate limits, quotas, outages, a bad API key or sender) is
 * retried, because fixing the cause makes the same send succeed.
 */
const PERMANENT = new Set(["validation_error", "invalid_parameter", "missing_required_field"]);

export function isPermanentSendError(name: string | null | undefined): boolean {
  return Boolean(name && PERMANENT.has(name));
}

export type BatchItemOutcome = { ok: true; id: string | null } | { ok: false; error: string };

/**
 * A permissive batch sends the valid emails and lists the rejected ones by index; `data` holds the
 * ids of the emails that went out, in order. Returns one outcome per email we asked for.
 */
export function batchOutcomes(count: number, data: readonly { id: string }[], errors: readonly { index: number; message: string }[]): BatchItemOutcome[] {
  const rejected = new Map(errors.map((e) => [e.index, e.message]));
  let next = 0;
  return Array.from({ length: count }, (_, i): BatchItemOutcome => {
    const error = rejected.get(i);
    if (error !== undefined) return { ok: false, error };
    return { ok: true, id: data[next++]?.id ?? null };
  });
}
