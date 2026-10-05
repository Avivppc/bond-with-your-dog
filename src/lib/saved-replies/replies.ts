import { z } from "zod";

/**
 * Saved replies: reusable texts the team drops into any reply box (video feedback, lesson
 * questions, the inbox). {{tags}} are filled from the member being answered. Pure.
 */

export interface SavedReply {
  id: string;
  title: string;
  body: string;
}

export const REPLY_TITLE_MAX = 80;
export const REPLY_BODY_MAX = 4000;

export const savedReplySchema = z.object({
  title: z.string().trim().min(1, "Give the reply a name.").max(REPLY_TITLE_MAX, `Keep the name under ${REPLY_TITLE_MAX} characters.`),
  body: z.string().trim().min(1, "Write the reply text.").max(REPLY_BODY_MAX, `Keep the text under ${REPLY_BODY_MAX.toLocaleString("en-US")} characters.`),
});

export type SavedReplyInput = z.infer<typeof savedReplySchema>;

/** The tags a reply can use, in the order the "Insert" chips show them. */
export const REPLY_TAGS = [
  { key: "first_name", label: "First name" },
  { key: "dog_name", label: "Dog's name" },
  { key: "move_name", label: "Move" },
  { key: "lesson_title", label: "Lesson" },
] as const;

export type ReplyTag = (typeof REPLY_TAGS)[number]["key"];
export type ReplyVars = Partial<Record<ReplyTag, string | null | undefined>>;

const TAG_RE = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

/**
 * Fills the tags that have a value. A tag without one stays as {{tag}}: a person sends this, so
 * a visible gap they can fix beats a silent "Great job with !".
 */
export function fillReply(text: string, vars: ReplyVars): string {
  return text.replace(TAG_RE, (tag: string, key: string) => {
    const name = key.toLowerCase();
    // Own string values only: {{constructor}} must not reach Object.prototype.
    const raw = Object.hasOwn(vars, name) ? (vars as Record<string, unknown>)[name] : undefined;
    const value = typeof raw === "string" ? raw.trim() : "";
    return value || tag;
  });
}

const MIN_TEMPLATE_VALUE = 2;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The reverse of fillReply, for "Save as reply": this member's names become tags again so the
 * saved text fits the next member. Whole words only, longest value first ("Max" never eats "Maximum").
 */
export function toTemplate(text: string, vars: ReplyVars): string {
  const pairs = Object.entries(vars)
    .map(([key, value]) => [key, value?.trim() ?? ""] as const)
    .filter(([, value]) => value.length >= MIN_TEMPLATE_VALUE)
    .sort((a, b) => b[1].length - a[1].length);
  if (pairs.length === 0) return text;
  const tagFor = new Map(pairs.map(([key, value]) => [value, key]));
  // One pass, so a tag just written ({{first_name}}) is never matched by a later value.
  const any = new RegExp(`(?<![\\p{L}\\p{N}])(${pairs.map(([, value]) => escapeRegExp(value)).join("|")})(?![\\p{L}\\p{N}])`, "gu");
  return text.replace(any, (match: string) => `{{${tagFor.get(match)}}}`);
}

/** Tags still waiting for a value, each once. */
export function unfilledTags(text: string): string[] {
  return [...new Set(Array.from(text.matchAll(TAG_RE), (m) => m[1].toLowerCase()))];
}

/** For texts sent to a member: true once every {{tag}} has been replaced. */
export function isFilledIn(text: string): boolean {
  return unfilledTags(text).length === 0;
}

export const UNFILLED_TAGS_ERROR = "Replace the {{tags}} in your reply before sending.";

/** Replies whose name or text contains the search, ignoring case. */
export function filterReplies<T extends SavedReply>(replies: readonly T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...replies];
  return replies.filter((r) => r.title.toLowerCase().includes(q) || r.body.toLowerCase().includes(q));
}
