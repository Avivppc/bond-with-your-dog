/**
 * Signup now redirects straight into the app, so no page renders "signup done". The server
 * sets this short-lived, script-readable cookie instead, and SignupCompletedTracker turns it
 * into one signup_completed event, then clears it.
 */
export const SIGNUP_COMPLETED_COOKIE = "bonded_signup_completed";
export const SIGNUP_MARKER_MAX_AGE_SECONDS = 600;

export type SignupMethod = "password" | "google";

/** The signup method stored in the marker cookie, or null when there is none. */
export function readSignupMarker(cookieHeader: string): string | null {
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== SIGNUP_COMPLETED_COOKIE) continue;
    const value = decodeURIComponent(rest.join("="));
    return value || null;
  }
  return null;
}
