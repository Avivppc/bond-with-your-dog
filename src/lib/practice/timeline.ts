import { z } from "zod";

/**
 * Routine builder timeline: move blocks placed on the music, in lanes. All times in seconds.
 * Every operation returns a new array (callers keep the previous one for undo). Pure.
 */
export const LANES = 2;
export const MIN_BLOCK_SECONDS = 2;
export const SNAP_SECONDS = 0.5;
export const DEFAULT_BLOCK_SECONDS = 8;
/** A new block spans two bars of four beats when the member gives a BPM. */
export const BEATS_PER_BLOCK = 8;
export const MAX_ITEMS = 120;
export const MAX_ROUTINE_SECONDS = 1200;

export const RoutineItemSchema = z
  .object({
    move_id: z.string().uuid(),
    start: z.number().min(0).max(MAX_ROUTINE_SECONDS),
    end: z.number().min(0).max(MAX_ROUTINE_SECONDS),
    lane: z.number().int().min(0).max(LANES - 1),
  })
  .refine((i) => i.end - i.start >= MIN_BLOCK_SECONDS - 1e-9, { message: "A move needs at least 2 seconds." });
export type RoutineItem = z.infer<typeof RoutineItemSchema>;

export function parseRoutineItems(raw: unknown): RoutineItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    const parsed = RoutineItemSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export function snap(seconds: number): number {
  return Math.round(seconds / SNAP_SECONDS) * SNAP_SECONDS;
}

export function defaultBlockSeconds(bpm: number | null): number {
  if (!bpm || bpm <= 0) return DEFAULT_BLOCK_SECONDS;
  return Math.min(20, Math.max(4, snap((BEATS_PER_BLOCK * 60) / bpm)));
}

function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start < b.end - 1e-9 && b.start < a.end - 1e-9;
}

export function sortItems(items: readonly RoutineItem[]): RoutineItem[] {
  return [...items].sort((a, b) => a.start - b.start || a.lane - b.lane);
}

function fits(items: readonly RoutineItem[], candidate: { start: number; end: number; lane: number }, ignore = -1): boolean {
  return items.every((it, i) => i === ignore || it.lane !== candidate.lane || !overlaps(it, candidate));
}

/** First start time ≥ `from` where a block of `length` fits in `lane`, or null. */
export function findFreeSlot(items: readonly RoutineItem[], lane: number, length: number, duration: number, from = 0): number | null {
  const inLane = sortItems(items.filter((i) => i.lane === lane));
  let cursor = Math.max(0, from);
  for (const it of inLane) {
    if (it.end <= cursor) continue;
    if (it.start - cursor >= length - 1e-9) break;
    cursor = Math.max(cursor, it.end);
  }
  return cursor + length <= duration + 1e-9 ? cursor : null;
}

export type TimelineResult = { ok: true; items: RoutineItem[] } | { ok: false; items: RoutineItem[]; error: string };

/** Adds a move after the last block (main lane first, then the second lane). */
export function addBlock(items: readonly RoutineItem[], moveId: string, duration: number, bpm: number | null): TimelineResult {
  if (items.length >= MAX_ITEMS) return { ok: false, items: [...items], error: "That's the most moves one routine can hold." };
  const length = Math.min(defaultBlockSeconds(bpm), duration);
  for (let lane = 0; lane < LANES; lane += 1) {
    const inLane = items.filter((i) => i.lane === lane);
    const after = inLane.reduce((max, i) => Math.max(max, i.end), 0);
    const start = findFreeSlot(items, lane, length, duration, after) ?? findFreeSlot(items, lane, length, duration, 0);
    if (start !== null) {
      return { ok: true, items: sortItems([...items, { move_id: moveId, start, end: start + length, lane }]) };
    }
  }
  return { ok: false, items: [...items], error: "The song is full. Remove or shorten a move first." };
}

export function removeBlock(items: readonly RoutineItem[], index: number): RoutineItem[] {
  return items.filter((_, i) => i !== index);
}

/** Moves a block to a new start (and lane); refuses to overlap another block. */
export function moveBlock(items: readonly RoutineItem[], index: number, start: number, lane: number, duration: number): TimelineResult {
  const it = items[index];
  if (!it) return { ok: false, items: [...items], error: "That move isn't on the timeline." };
  const length = it.end - it.start;
  const nextStart = Math.min(Math.max(0, snap(start)), Math.max(0, duration - length));
  const nextLane = Math.min(LANES - 1, Math.max(0, lane));
  const candidate = { ...it, start: nextStart, end: nextStart + length, lane: nextLane };
  if (!fits(items, candidate, index)) return { ok: false, items: [...items], error: "Another move is already there." };
  // Order is kept (not re-sorted) so the caller's selection and keys keep pointing at this block.
  return { ok: true, items: items.map((x, i) => (i === index ? candidate : x)) };
}

/** Changes a block's end, kept between the minimum length, the next block in its lane and the song's end. */
export function resizeBlock(items: readonly RoutineItem[], index: number, end: number, duration: number): RoutineItem[] {
  const it = items[index];
  if (!it) return [...items];
  const nextStart = items
    .filter((x, i) => i !== index && x.lane === it.lane && x.start >= it.end - 1e-9)
    .reduce((min, x) => Math.min(min, x.start), duration);
  const clamped = Math.min(nextStart, duration, Math.max(it.start + MIN_BLOCK_SECONDS, snap(end)));
  return items.map((x, i) => (i === index ? { ...x, end: clamped } : x));
}

/** Drops or trims blocks that no longer fit after the music changed to a shorter track. */
export function fitToDuration(items: readonly RoutineItem[], duration: number): RoutineItem[] {
  return items.flatMap((it) => {
    if (it.start + MIN_BLOCK_SECONDS > duration) return [];
    return [{ ...it, end: Math.min(it.end, duration) }];
  });
}

/** Seconds covered by at least one move (lanes can overlap in time). */
export function plannedSeconds(items: readonly RoutineItem[]): number {
  const spans = [...items].sort((a, b) => a.start - b.start);
  let total = 0;
  let curStart = -1;
  let curEnd = -1;
  for (const s of spans) {
    if (s.start > curEnd) {
      if (curEnd > curStart) total += curEnd - curStart;
      curStart = s.start;
      curEnd = s.end;
    } else {
      curEnd = Math.max(curEnd, s.end);
    }
  }
  if (curEnd > curStart) total += curEnd - curStart;
  return total;
}

/** The block playing at `t` (main lane wins), or -1. */
export function activeBlockIndex(items: readonly RoutineItem[], t: number): number {
  let found = -1;
  items.forEach((it, i) => {
    if (t >= it.start && t < it.end && (found === -1 || it.lane < items[found].lane)) found = i;
  });
  return found;
}

/** "1:05" */
export function formatTimecode(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Evenly spaced tick labels from 0 to the song's length. */
export function tickLabels(duration: number, count = 9): string[] {
  if (duration <= 0) return [];
  return Array.from({ length: count }, (_, i) => formatTimecode((duration * i) / (count - 1)));
}

/** Converts a horizontal drag (pixels) into seconds on a track of `width` pixels. */
export function pixelsToSeconds(dx: number, width: number, duration: number): number {
  if (width <= 0) return 0;
  return (dx / width) * duration;
}
