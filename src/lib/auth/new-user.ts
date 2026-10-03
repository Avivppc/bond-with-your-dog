/** How close the first sign-in must be to account creation to count as a brand-new signup. */
const FIRST_SIGN_IN_WINDOW_MS = 60_000;

interface AuthTimestamps {
  created_at: string;
  last_sign_in_at?: string | null;
}

/**
 * True when this sign-in is the one that created the account (e.g. a first
 * Google login). Returning users have a last_sign_in_at far from created_at.
 */
export function isFirstSignIn(user: AuthTimestamps): boolean {
  if (!user.last_sign_in_at) return true;
  const created = Date.parse(user.created_at);
  const lastSignIn = Date.parse(user.last_sign_in_at);
  if (Number.isNaN(created) || Number.isNaN(lastSignIn)) return false;
  return Math.abs(lastSignIn - created) < FIRST_SIGN_IN_WINDOW_MS;
}
