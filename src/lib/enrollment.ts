/**
 * Mirrors the database rule (can_access_lesson): an enrollment grants access while
 * expires_at is null (lifetime) or in the future. Refunds/revokes set expires_at to now.
 */
export function isEnrollmentActive(
  enrollment: { expires_at: string | null } | null | undefined,
  now: Date = new Date()
): boolean {
  if (!enrollment) return false;
  return enrollment.expires_at === null || new Date(enrollment.expires_at) > now;
}
