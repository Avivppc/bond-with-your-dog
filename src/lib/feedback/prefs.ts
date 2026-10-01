/** Member notification preferences (profiles.notif_prefs). Pure; unknown keys are preserved. */

export const NOTIF_PREFS = [
  { key: "practice_reminders", label: "Practice reminders", hint: "On your practice days", fallback: true },
  { key: "feedback", label: "Feedback from Roni", hint: "When Roni replies to a video", fallback: true },
  { key: "new_lesson", label: "New lesson opens", hint: "When a new lesson opens in your chapter", fallback: true },
  { key: "live_qa", label: "Live Q&A reminders", hint: "Before each Live Q&A session", fallback: false },
  { key: "reminder_emails", label: "Reminders by email", hint: "Practice and Live Q&A reminders also go to your inbox", fallback: false },
] as const;

export type NotifPrefKey = (typeof NOTIF_PREFS)[number]["key"];
export type NotifPrefs = Record<NotifPrefKey, boolean>;

export const NOTIF_PREF_KEYS = NOTIF_PREFS.map((p) => p.key) as readonly NotifPrefKey[];

/** Older profiles stored these names before the member app. */
const LEGACY: Partial<Record<NotifPrefKey, string>> = { live_qa: "live_sessions", new_lesson: "new_courses" };

export function isNotifPrefKey(value: string): value is NotifPrefKey {
  return (NOTIF_PREF_KEYS as readonly string[]).includes(value);
}

export function readNotifPrefs(raw: unknown): NotifPrefs {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const pick = (key: NotifPrefKey, fallback: boolean): boolean => {
    if (typeof src[key] === "boolean") return src[key] as boolean;
    const legacy = LEGACY[key];
    if (legacy && typeof src[legacy] === "boolean") return src[legacy] as boolean;
    return fallback;
  };
  return Object.fromEntries(NOTIF_PREFS.map((p) => [p.key, pick(p.key, p.fallback)])) as NotifPrefs;
}

/** A new prefs object with one switch changed (other stored keys kept as they were). */
export function withNotifPref(raw: unknown, key: NotifPrefKey, value: boolean): Record<string, unknown> {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return { ...src, [key]: value };
}
