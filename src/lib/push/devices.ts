/**
 * Phone notifications as the admin shows them: which of a member's devices have push turned on.
 * A device row exists while notifications are on (src/app/(member)/settings/push-actions.ts) and is
 * removed when they're turned off, on sign-out, or when the push service says it's gone. Pure.
 */

export interface PushDeviceRow {
  user_id: string;
  user_agent: string | null;
  last_seen_at: string;
}

export interface PushStatus {
  /** Devices with notifications on (0 = off). */
  devices: number;
  /** "iPhone", "Android", "iPhone, Mac"…; null when off. */
  label: string | null;
  /** When a device last turned notifications on or checked in. */
  lastSeenAt: string | null;
}

export const PUSH_OFF: PushStatus = { devices: 0, label: null, lastSeenAt: null };

/** A short device name from a browser's user agent (iPadOS often says "Macintosh" with touch; fine here). */
export function deviceLabel(userAgent: string | null): string {
  const ua = userAgent ?? "";
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux|CrOS/i.test(ua)) return "Computer";
  return "Browser";
}

/** Each member's push status from their device rows (members without rows aren't in the map: off). */
export function pushStatusByUser(rows: readonly PushDeviceRow[]): Map<string, PushStatus> {
  const grouped = new Map<string, PushDeviceRow[]>();
  for (const row of rows) grouped.set(row.user_id, [...(grouped.get(row.user_id) ?? []), row]);
  return new Map(
    [...grouped].map(([userId, devices]) => {
      const labels = [...new Set(devices.map((d) => deviceLabel(d.user_agent)))];
      const lastSeenAt = devices.map((d) => d.last_seen_at).sort().at(-1) ?? null;
      return [userId, { devices: devices.length, label: labels.join(", "), lastSeenAt }];
    }),
  );
}
