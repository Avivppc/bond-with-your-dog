/**
 * Settings → Notifications: which events email the team. Pure so the rules can be tested; sending
 * lives in ./notify-team.ts.
 */

export const NOTIFY_EVENTS = ["orders", "videos", "questions", "inbox", "leads"] as const;
export type NotifyEvent = (typeof NOTIFY_EVENTS)[number];
export type NotifyPrefs = Record<NotifyEvent, boolean>;

export const NOTIFY_INFO: Record<NotifyEvent, { label: string; hint: string }> = {
  orders: { label: "New purchase", hint: "Someone paid for an offer." },
  videos: { label: "Video sent for feedback", hint: "A member's practice video is ready for Roni." },
  questions: { label: "Lesson question", hint: "A member asked a question under a lesson." },
  inbox: { label: "Inbox message", hint: "A question or problem report from the Help page." },
  leads: { label: "Website quiz lead", hint: "A visitor finished the quiz and left an email." },
};

export const DEFAULT_NOTIFY: NotifyPrefs = { orders: true, videos: true, questions: true, inbox: true, leads: false };

/** The saved JSON, with defaults for anything missing or malformed. */
export function readNotifyPrefs(raw: unknown): NotifyPrefs {
  const saved = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(NOTIFY_EVENTS.map((e) => [e, typeof saved[e] === "boolean" ? saved[e] : DEFAULT_NOTIFY[e]])) as NotifyPrefs;
}

/** Checkbox form fields (`notify_orders=on`) → prefs. Unchecked boxes aren't sent, so absent means off. */
export function notifyPrefsFromForm(form: Record<string, unknown>): NotifyPrefs {
  return Object.fromEntries(NOTIFY_EVENTS.map((e) => [e, form[`notify_${e}`] === "on"])) as NotifyPrefs;
}

/** The team's address: Settings → Notifications, else the COACH_INBOX environment variable. */
export function teamRecipient(teamEmail: string | null, envInbox: string | undefined): string | null {
  return teamEmail?.trim() || envInbox?.trim() || null;
}
