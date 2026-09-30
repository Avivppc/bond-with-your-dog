/**
 * Video feedback: pure helpers for timestamps, scrub-bar markers and Mux image URLs.
 * No Next/Supabase imports so they're easy to test.
 */

export interface TimedNote {
  id: string;
  at_seconds: number;
  body: string;
}

export interface NoteMarker {
  id: string;
  percent: number;
  label: string;
}

/** 4 → "0:04", 75 → "1:15", 3723 → "1:02:03". Negative or invalid input reads as 0. */
export function formatClock(seconds: number | null | undefined): string {
  const total = Number.isFinite(seconds) && (seconds as number) > 0 ? Math.floor(seconds as number) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Player readout, as in the design: 4 → "00:04", 75 → "01:15". */
export function formatTimer(seconds: number | null | undefined): string {
  const total = Number.isFinite(seconds) && (seconds as number) > 0 ? Math.floor(seconds as number) : 0;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Where a moment sits on the scrub bar, 0–100 (two decimals). Unknown duration → 0. */
export function markerPercent(atSeconds: number, durationSeconds: number | null | undefined): number {
  if (!durationSeconds || !Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0;
  const pct = (Math.max(0, atSeconds) / durationSeconds) * 100;
  return Math.round(Math.min(100, pct) * 100) / 100;
}

/** Notes in time order. */
export function sortNotes<T extends TimedNote>(notes: readonly T[]): T[] {
  return [...notes].sort((a, b) => a.at_seconds - b.at_seconds);
}

/** One marker per note, in time order. */
export function noteMarkers(notes: readonly TimedNote[], durationSeconds: number | null | undefined): NoteMarker[] {
  return sortNotes(notes).map((n) => ({ id: n.id, percent: markerPercent(n.at_seconds, durationSeconds), label: formatClock(n.at_seconds) }));
}

/** The note the playhead has most recently passed (null before the first one). */
export function currentNoteId(notes: readonly TimedNote[], currentSeconds: number): string | null {
  let found: string | null = null;
  for (const n of sortNotes(notes)) {
    if (n.at_seconds <= currentSeconds + 0.25) found = n.id;
    else break;
  }
  return found;
}

/** Still frame from Mux for list thumbnails. */
export function muxThumbnailUrl(playbackId: string, atSeconds?: number): string {
  const base = `https://image.mux.com/${encodeURIComponent(playbackId)}/thumbnail.jpg?width=480`;
  return atSeconds && atSeconds > 0 ? `${base}&time=${Math.floor(atSeconds)}` : base;
}

/** Roni's summary as the design shows it: the first sentence as the headline, the rest below. */
export function splitSummary(summary: string | null | undefined): { headline: string; rest: string } {
  const text = (summary ?? "").trim();
  const match = text.match(/^(.+?[.!?])(\s+|$)([\s\S]*)$/);
  if (!match) return { headline: text, rest: "" };
  return { headline: match[1].trim(), rest: match[3].trim() };
}

/** "1 note" / "3 notes". */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
