/**
 * Compute when a lesson unlocks for a given user, based on their enrollment date
 * and the lesson's `available_after_days`. Returns null if unlocked immediately.
 */
export function computeUnlockAt(
  enrolledAt: string | null | undefined,
  availableAfterDays: number | null | undefined
): Date | null {
  if (!enrolledAt || availableAfterDays == null) return null;
  const ms = new Date(enrolledAt).getTime() + availableAfterDays * 24 * 60 * 60 * 1000;
  return new Date(ms);
}

export function isLockedNow(unlockAt: Date | null): boolean {
  if (!unlockAt) return false;
  return unlockAt.getTime() > Date.now();
}

export function formatUnlockDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}
