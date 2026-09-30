"use client";

import { timeAgo, linkify } from "@/lib/community/format";
import type { Author } from "@/lib/community/queries";

/** Community palette: Kajabi's neutral community look with Bonded's teal as the accent. */
export const C = {
  page: "#f7f7f8",
  line: "#e7e6e4",
  ink: "#1a1a19",
  muted: "#6c6a69",
  accent: "#0e666a",
  accentSoft: "#e3f5f5",
} as const;

export const CARD = "rounded-[14px] border border-[#e7e6e4] bg-white";
export const BTN = "inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0e666a] px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50";
export const BTN_GHOST = "inline-flex items-center justify-center gap-1.5 rounded-full border border-[#e7e6e4] bg-white px-4 py-2 text-sm font-semibold text-[#1a1a19] hover:bg-[#f3f3f2] disabled:opacity-50";
export const FIELD = "w-full rounded-[10px] border border-[#e7e6e4] bg-white px-3 py-2 text-sm focus:border-[#0e666a] focus:outline-none";

const AVATAR_COLORS = ["#0e666a", "#ff8f00", "#5b6bd6", "#c2508c", "#3f8f5c", "#8a5a00"];

export function Avatar({ author, size = 36 }: { author: Pick<Author, "id" | "name" | "avatarUrl">; size?: number }) {
  const color = AVATAR_COLORS[author.id.charCodeAt(0) % AVATAR_COLORS.length];
  return author.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- member avatar URL from their profile
    <img src={author.avatarUrl} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, backgroundColor: color, fontSize: size * 0.42 }}
    >
      {author.name.charAt(0).toUpperCase()}
    </span>
  );
}

/** Relative time, rendered in the viewer's browser (server output may differ by a minute). */
export function TimeAgo({ iso }: { iso: string }) {
  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString()} suppressHydrationWarning>
      {timeAgo(iso)}
    </time>
  );
}

/** Member-written text: line breaks kept, http(s) links clickable, never rendered as HTML. */
export function RichText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <p className={`whitespace-pre-wrap break-words ${className}`}>
      {linkify(text).map((part, i) =>
        part.href ? (
          <a key={i} href={part.href} target="_blank" rel="noopener noreferrer nofollow" className="text-[#0e666a] underline">
            {part.text}
          </a>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </p>
  );
}
