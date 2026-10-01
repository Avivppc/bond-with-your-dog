import type { AnalyticsDecision } from "./policy";

/** enrollments.source values (20260929000000_phase0_access_foundations.sql). */
export type EnrollmentSource = "free" | "grant" | "order" | "subscription" | "legacy";

export interface EnrollmentAccess {
  source: string;
  expires_at: string | null;
}

/**
 * Enrollment sources that mean the member paid: bought here (order, subscription).
 * Not paying: free access, grants from /admin (gifts and staff access) and legacy rows
 * (there are no earlier paying customers; Bonded starts from zero).
 */
export const PAID_SOURCES: ReadonlySet<EnrollmentSource> = new Set<EnrollmentSource>(["order", "subscription"]);

export function isPayingMember(enrollments: readonly EnrollmentAccess[], now: Date): boolean {
  return enrollments.some(
    (e) =>
      PAID_SOURCES.has(e.source as EnrollmentSource) && (e.expires_at === null || new Date(e.expires_at) > now),
  );
}

export interface TrackingCheck {
  /** The member's cookie choice when the event comes from their own request; null otherwise. */
  requestDecision: AnalyticsDecision | null;
  isPaying: boolean;
}

/**
 * Server events carry the member's email, so they follow the cookie choice,
 * except for paying members: their activity in the course they bought is
 * analysed without cookies, as the privacy policy says.
 */
export function serverTrackingAllowed({ requestDecision, isPaying }: TrackingCheck): boolean {
  return isPaying || requestDecision === "granted";
}
