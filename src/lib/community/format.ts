/** Pure display helpers for the community (shared with the mobile app). */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** "just now", "45m", "5h", "3d", then "Aug 1" (or "Aug 1, 2025" in another year). UTC dates. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const diff = now.getTime() - then.getTime();
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d`;
  const sameYear = then.getUTCFullYear() === now.getUTCFullYear();
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }), timeZone: "UTC" });
}

export interface TextPart {
  text: string;
  href?: string;
}

const URL_RE = /https?:\/\/[^\s<>"']+[^\s<>"'.,;:!?)\]]/g;

/** Plain text → parts with http(s) links only (rendered as text, never as HTML). */
export function linkify(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    if (start > last) parts.push({ text: text.slice(last, start) });
    parts.push({ text: match[0], href: match[0] });
    last = start + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

export interface PollResult {
  total: number;
  options: { label: string; votes: number; percent: number }[];
}

export function pollResults(options: readonly string[], counts: readonly { option_index: number; votes: number }[]): PollResult {
  const votesAt = new Map(counts.map((c) => [c.option_index, Number(c.votes)]));
  const total = options.reduce((sum, _, i) => sum + (votesAt.get(i) ?? 0), 0);
  return {
    total,
    options: options.map((label, i) => {
      const votes = votesAt.get(i) ?? 0;
      return { label, votes, percent: total ? Math.round((votes / total) * 100) : 0 };
    }),
  };
}
