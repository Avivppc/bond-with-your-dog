/** Checks the `Authorization: Bearer <CRON_SECRET>` header Vercel Cron sends. Pure. */
import { createHash, timingSafeEqual } from "node:crypto";

const MIN_SECRET_LENGTH = 16;

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/**
 * True only when a (reasonably long) secret is configured and the header carries exactly it.
 * Compares fixed-length digests so the check takes the same time whatever the input.
 */
export function isAuthorizedCron(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < MIN_SECRET_LENGTH || !authorization) return false;
  return timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`));
}
