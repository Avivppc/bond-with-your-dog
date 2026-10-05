import { z } from "zod";

/**
 * Notifications to members (and one to the team): which exist, their default wording, the tags
 * each may use, and the settings staff edit in Admin → Settings → Member notifications. The
 * database seeds the same defaults (migration 20261111000000); a test keeps the two in step. Pure.
 */

export const TOPICS = ["feedback_reply", "staff_reply", "question_answered", "support_answered", "achievement", "practice", "lesson_unlocked", "live_session", "feedback_overdue"] as const;
export type Topic = (typeof TOPICS)[number];

/** The bell's category for each topic (notifications.kind). */
export const TOPIC_KIND: Record<Topic, "feedback" | "answer" | "support" | "achievement" | "system" | "lesson" | "event"> = {
  feedback_reply: "feedback",
  staff_reply: "feedback",
  question_answered: "answer",
  support_answered: "support",
  achievement: "achievement",
  practice: "system",
  lesson_unlocked: "lesson",
  live_session: "event",
  feedback_overdue: "system",
};

export interface TagDef {
  key: string;
  label: string;
  /** What the preview and "Send me a test" fill in. */
  sample: string;
}

export interface TopicDef {
  topic: Topic;
  label: string;
  /** When it goes out, in plain words for the admin page. */
  trigger: string;
  audience: "members" | "team";
  /** Whether an email can go with it (practice and Live also need the member's "Reminders by email"). */
  hasEmail: boolean;
  tags: readonly TagDef[];
  href: string;
}

const FIRST_NAME: TagDef = { key: "first_name", label: "First name", sample: "Dana" };

export const TOPIC_DEFS: readonly TopicDef[] = [
  {
    topic: "feedback_reply",
    label: "Roni's feedback on a video",
    trigger: "When Roni sends feedback on a member's video.",
    audience: "members",
    hasEmail: true,
    tags: [FIRST_NAME, { key: "video_title", label: "Video", sample: "Spin" }, { key: "notes", label: "Notes count", sample: "3 notes and a summary" }],
    href: "/feedback",
  },
  {
    topic: "staff_reply",
    label: "Reply in a video conversation",
    trigger: "Each time the team answers under a member's video.",
    audience: "members",
    hasEmail: true,
    tags: [FIRST_NAME, { key: "video_title", label: "Video", sample: "Spin" }, { key: "reply", label: "Reply", sample: "Lovely! Try it with a lower hand next time." }],
    href: "/feedback",
  },
  {
    topic: "question_answered",
    label: "Answer to a lesson question",
    trigger: "When a lesson question gets its first answer.",
    audience: "members",
    hasEmail: false,
    tags: [FIRST_NAME, { key: "lesson_title", label: "Lesson", sample: "Hand Target" }, { key: "question", label: "Question", sample: "Should Luna's nose touch my palm?" }],
    href: "/notifications",
  },
  {
    topic: "support_answered",
    label: "Answer from the team (inbox)",
    trigger: "When the team answers a message from Help.",
    audience: "members",
    hasEmail: true,
    tags: [FIRST_NAME, { key: "subject", label: "Subject", sample: "Video won't play" }],
    href: "/help",
  },
  {
    topic: "achievement",
    label: "New achievement",
    trigger: "When a member earns an achievement (first practice, 6-day streak…).",
    audience: "members",
    hasEmail: false,
    tags: [FIRST_NAME, { key: "achievement", label: "Achievement", sample: "First steps" }, { key: "description", label: "Description", sample: "You logged your first practice." }],
    href: "/progress",
  },
  {
    topic: "practice",
    label: "Practice reminder",
    trigger: "On the member's practice days, if they haven't practiced yet.",
    audience: "members",
    hasEmail: true,
    tags: [FIRST_NAME, { key: "day", label: "Today / Tomorrow", sample: "Today" }, { key: "minutes", label: "Minutes", sample: "10" }],
    href: "/plan",
  },
  {
    topic: "lesson_unlocked",
    label: "A new lesson is open",
    trigger: "When a drip lesson opens for a member.",
    audience: "members",
    hasEmail: false,
    tags: [FIRST_NAME, { key: "lesson_title", label: "Lesson", sample: "Spin / Twist" }, { key: "course_title", label: "Chapter", sample: "Bonded: Foundations" }],
    href: "/my-courses",
  },
  {
    topic: "live_session",
    label: "Live Q&A and meetup reminder",
    trigger: "Before a Live Q&A (members who want it) or a meetup (those coming).",
    audience: "members",
    hasEmail: true,
    tags: [FIRST_NAME, { key: "session", label: "Session", sample: "Live Q&A with Roni" }, { key: "when", label: "When", sample: "tomorrow at 6:00 PM" }, { key: "topic", label: "Topic", sample: "Teaching the spin" }],
    href: "/community",
  },
  {
    topic: "feedback_overdue",
    label: "For the team: a video is waiting",
    trigger: "When a member's video has waited too long for feedback.",
    audience: "team",
    hasEmail: true,
    tags: [{ key: "days", label: "Days waiting", sample: "5" }],
    href: "/studio",
  },
];

export const TOPIC_DEF: Record<Topic, TopicDef> = Object.fromEntries(TOPIC_DEFS.map((d) => [d.topic, d])) as Record<Topic, TopicDef>;

export interface TopicSettings {
  enabled: boolean;
  push: boolean;
  email: boolean;
  title: string;
  body: string;
}

export interface NotificationSettings {
  topics: Record<Topic, TopicSettings>;
  /** Practice reminder: on the practice day itself or the evening before, from this local hour. */
  practice: { when: "day_of" | "day_before"; hour: number };
  /** A new lesson is announced from this local hour. */
  lessonUnlocked: { hour: number };
  /** Live: the day before (from a local hour) and/or a few hours before it starts. */
  liveSession: { dayBefore: boolean; dayBeforeHour: number; dayOf: boolean; hoursBefore: number };
  /** The team hears about a video after it waited this many days. */
  feedbackOverdue: { days: number };
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  topics: {
    feedback_reply: { enabled: true, push: true, email: true, title: "Roni replied to your {{video_title}} video", body: "{{notes}}" },
    staff_reply: { enabled: true, push: true, email: true, title: "Roni answered you about {{video_title}}", body: "{{reply}}" },
    question_answered: { enabled: true, push: true, email: false, title: "Roni answered your question", body: "{{question}}" },
    support_answered: { enabled: true, push: true, email: true, title: "Roni's team replied", body: "{{subject}}" },
    achievement: { enabled: true, push: false, email: false, title: "New achievement: {{achievement}}", body: "{{description}}" },
    practice: { enabled: true, push: true, email: true, title: "{{day}} is a practice day", body: "{{minutes}} minutes with your dog is all it takes. Your plan is ready." },
    lesson_unlocked: { enabled: true, push: true, email: false, title: "A new lesson is open: {{lesson_title}}", body: "{{course_title}}" },
    live_session: { enabled: true, push: true, email: true, title: "{{session}} {{when}}", body: "{{topic}}" },
    feedback_overdue: { enabled: true, push: true, email: true, title: "A feedback video has waited {{days}} days", body: "Open Roni's Studio to reply." },
  },
  practice: { when: "day_of", hour: 9 },
  lessonUnlocked: { hour: 9 },
  liveSession: { dayBefore: true, dayBeforeHour: 18, dayOf: true, hoursBefore: 2 },
  feedbackOverdue: { days: 5 },
};

export const TITLE_MAX = 120;
export const BODY_MAX = 300;
const TAG_RE = /\{\{([a-z0-9_]+)\}\}/g;
const ANY_TAG_RE = /\{\{\s*[a-z0-9_]*\s*\}\}/gi;

/**
 * Fills {{tags}}; a tag without a value (or unknown) disappears and spacing is tidied, so a member
 * never sees braces. The database's private.fill_template does exactly the same.
 */
export function fillTemplate(text: string, vars: Readonly<Record<string, string | null | undefined>>): string {
  return text
    .replace(TAG_RE, (_, key: string) => (Object.hasOwn(vars, key) ? (vars[key] ?? "") : ""))
    .replace(ANY_TAG_RE, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Tags used in a text that this topic doesn't offer. */
export function unknownTags(text: string, topic: Topic): string[] {
  const offered = new Set(TOPIC_DEF[topic].tags.map((t) => t.key));
  return [...new Set(Array.from(text.matchAll(/\{\{\s*([a-z0-9_]*)\s*\}\}/gi), (m) => m[1].toLowerCase()))].filter((k) => !offered.has(k));
}

export function sampleVars(topic: Topic): Record<string, string> {
  return Object.fromEntries(TOPIC_DEF[topic].tags.map((t) => [t.key, t.sample]));
}

const hour = z.number().int().min(0).max(23);
const topicSchema = z.object({
  enabled: z.boolean(),
  push: z.boolean(),
  email: z.boolean(),
  title: z.string().trim().min(1, "Every notification needs a title.").max(TITLE_MAX, `Keep titles under ${TITLE_MAX} characters.`),
  body: z.string().trim().max(BODY_MAX, `Keep the text under ${BODY_MAX} characters.`),
});

export const notificationSettingsSchema = z
  .object({
    topics: z.object(Object.fromEntries(TOPICS.map((t) => [t, topicSchema])) as Record<Topic, typeof topicSchema>),
    practice: z.object({ when: z.enum(["day_of", "day_before"]), hour }),
    lessonUnlocked: z.object({ hour }),
    liveSession: z.object({ dayBefore: z.boolean(), dayBeforeHour: hour, dayOf: z.boolean(), hoursBefore: z.number().int().min(1).max(12) }),
    feedbackOverdue: z.object({ days: z.number().int().min(1).max(30) }),
  })
  .superRefine((value, ctx) => {
    for (const topic of TOPICS) {
      const { title, body } = value.topics[topic];
      const bad = unknownTags(`${title} ${body}`, topic);
      if (bad.length) ctx.addIssue({ code: "custom", path: ["topics", topic], message: `${TOPIC_DEF[topic].label}: {{${bad[0]}}} isn't available here.` });
    }
  });

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Saved settings over the defaults, field by field; anything invalid falls back to the defaults. */
export function readNotificationSettings(raw: unknown): NotificationSettings {
  if (!isRecord(raw)) return DEFAULT_NOTIFICATION_SETTINGS;
  const savedTopics = isRecord(raw.topics) ? raw.topics : {};
  const merged = {
    topics: Object.fromEntries(
      TOPICS.map((t) => [t, { ...DEFAULT_NOTIFICATION_SETTINGS.topics[t], ...(isRecord(savedTopics[t]) ? savedTopics[t] : {}) }]),
    ),
    practice: { ...DEFAULT_NOTIFICATION_SETTINGS.practice, ...(isRecord(raw.practice) ? raw.practice : {}) },
    lessonUnlocked: { ...DEFAULT_NOTIFICATION_SETTINGS.lessonUnlocked, ...(isRecord(raw.lessonUnlocked) ? raw.lessonUnlocked : {}) },
    liveSession: { ...DEFAULT_NOTIFICATION_SETTINGS.liveSession, ...(isRecord(raw.liveSession) ? raw.liveSession : {}) },
    feedbackOverdue: { ...DEFAULT_NOTIFICATION_SETTINGS.feedbackOverdue, ...(isRecord(raw.feedbackOverdue) ? raw.feedbackOverdue : {}) },
  };
  const parsed = notificationSettingsSchema.safeParse(merged);
  return parsed.success ? (parsed.data as NotificationSettings) : DEFAULT_NOTIFICATION_SETTINGS;
}

export interface FilledNotice {
  title: string;
  body: string | null;
}

/** A topic's title and text for these values; an all-tags title that came out empty uses the label. */
export function noticeText(settings: NotificationSettings, topic: Topic, vars: Readonly<Record<string, string | null | undefined>>): FilledNotice {
  const t = settings.topics[topic];
  const title = fillTemplate(t.title, vars) || TOPIC_DEF[topic].label;
  const body = fillTemplate(t.body, vars);
  return { title, body: body || null };
}
