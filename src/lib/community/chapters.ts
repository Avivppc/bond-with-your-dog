import { z } from "zod";

/**
 * Chapters (timestamps) on Live Q&A recordings: community_meetups.recording_chapters, a list of
 * { t: seconds, title }. Staff type them as "mm:ss Title" lines; members get links that open the
 * recording at that moment. Pure — the same rules as the SQL check (private.recording_chapters_valid).
 */
export const MAX_CHAPTERS = 50;
/** 600 minutes, the longest recording_minutes allowed. */
export const MAX_CHAPTER_SECONDS = 36_000;
export const MAX_CHAPTER_TITLE = 120;

export interface Chapter {
  t: number;
  title: string;
}

const ChapterSchema = z.strictObject({
  t: z.number().int().min(0).max(MAX_CHAPTER_SECONDS),
  title: z.string().min(1).max(MAX_CHAPTER_TITLE).refine((v) => v === v.trim(), "No spaces around chapter titles."),
});

export const ChaptersSchema = z
  .array(ChapterSchema)
  .max(MAX_CHAPTERS, `Up to ${MAX_CHAPTERS} chapters.`)
  .refine((list) => list.every((c, i) => i === 0 || c.t > list[i - 1].t), "Chapters must be in time order, one per timestamp.");

/** Stored chapters as read from the database; anything malformed reads as no chapters. */
export function parseStoredChapters(value: unknown): Chapter[] {
  const parsed = ChaptersSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
}

/** 90 → "1:30", 3725 → "1:02:05". */
export function formatTimestamp(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

/** "1:30" → 90, "1:02:05" → 3725, "75:00" → 4500; null when it isn't a timestamp. */
export function parseTimestamp(text: string): number | null {
  const match = /^(\d{1,3})(?::(\d{2}))?:(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const [, first, middle, last] = match;
  const seconds = Number(last);
  if (seconds > 59) return null;
  if (middle === undefined) return Number(first) * 60 + seconds;
  const minutes = Number(middle);
  return minutes > 59 ? null : Number(first) * 3600 + minutes * 60 + seconds;
}

export type ChaptersParse = { ok: true; chapters: Chapter[] } | { ok: false; error: string };

const LINE = /^(\d{1,3}(?::\d{2}){1,2})\s*(?:[-–—|:]\s*)?(.*)$/;

/**
 * The admin textarea: one "mm:ss Title" (or "h:mm:ss Title") per line, blank lines ignored.
 * Lines may come in any order; the result is sorted by time.
 */
export function parseChapters(text: string): ChaptersParse {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const chapters: Chapter[] = [];
  for (const [index, line] of lines.entries()) {
    if (!line) continue;
    const where = `Line ${index + 1}`;
    const match = LINE.exec(line);
    const t = match ? parseTimestamp(match[1]) : null;
    if (!match || t === null) return { ok: false, error: `${where}: start with a time like 1:30, then the title.` };
    const title = match[2].trim();
    if (!title) return { ok: false, error: `${where}: add a title after the time.` };
    if (title.length > MAX_CHAPTER_TITLE) return { ok: false, error: `${where}: titles can be up to ${MAX_CHAPTER_TITLE} characters.` };
    if (t > MAX_CHAPTER_SECONDS) return { ok: false, error: `${where}: chapters can start up to 600 minutes in.` };
    chapters.push({ t, title });
  }
  if (chapters.length > MAX_CHAPTERS) return { ok: false, error: `Up to ${MAX_CHAPTERS} chapters.` };
  const sorted = [...chapters].sort((a, b) => a.t - b.t);
  const repeat = sorted.find((c, i) => i > 0 && c.t === sorted[i - 1].t);
  if (repeat) return { ok: false, error: `Two chapters start at ${formatTimestamp(repeat.t)}.` };
  return { ok: true, chapters: sorted };
}

/** Back to the textarea format. */
export function formatChapters(chapters: readonly Chapter[]): string {
  return chapters.map((c) => `${formatTimestamp(c.t)} ${c.title}`).join("\n");
}

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

/** Vimeo's "#t=1h2m5s" style. */
function vimeoTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h ? `${h}h` : ""}${h || m ? `${m}m` : ""}${s}s`;
}

/**
 * The recording link opened at `seconds`: YouTube ?t=90, Vimeo #t=1m30s, anything else the
 * media-fragment #t=90. A link that can't be parsed is returned unchanged.
 */
export function chapterUrl(recordingUrl: string, seconds: number): string {
  let url: URL;
  try {
    url = new URL(recordingUrl);
  } catch {
    return recordingUrl;
  }
  const at = Math.max(0, Math.floor(seconds));
  const host = url.hostname.toLowerCase();
  if (YOUTUBE_HOSTS.has(host)) {
    url.searchParams.set("t", String(at));
  } else if (VIMEO_HOSTS.has(host)) {
    url.hash = `t=${vimeoTime(at)}`;
  } else {
    url.hash = `t=${at}`;
  }
  return url.toString();
}
