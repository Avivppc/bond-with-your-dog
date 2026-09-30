/** Member search: query cleanup and result grouping. Pure. */
export const MIN_QUERY_LENGTH = 2;
export const MAX_QUERY_LENGTH = 80;

/** Trimmed, single-spaced query, or null when too short to search. */
export function normalizeQuery(raw: string | string[] | undefined): string | null {
  const value = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  const q = value.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH);
  return q.length >= MIN_QUERY_LENGTH ? q : null;
}

/**
 * An `ilike` pattern that matches the text literally: % _ and \ are escaped, and characters that
 * PostgREST's `or=(…)` filter syntax treats specially (and its `*` wildcard alias) are replaced by
 * a single-character wildcard.
 */
export function ilikePattern(q: string): string {
  const escaped = q.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/[,()"*]/g, "_");
  return `%${escaped}%`;
}

export type SearchGroupKey = "lessons" | "moves" | "feedback" | "qa";

export interface SearchHit {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  locked?: boolean;
  image?: string | null;
}

export interface SearchGroup {
  key: SearchGroupKey;
  label: string;
  hits: SearchHit[];
}

const GROUP_LABELS: Record<SearchGroupKey, string> = {
  lessons: "Lessons",
  moves: "Moves",
  feedback: "Feedback from Roni",
  qa: "Q&A recordings",
};
const GROUP_ORDER: SearchGroupKey[] = ["lessons", "moves", "feedback", "qa"];

/** Non-empty groups in the design's order, each de-duplicated by id. */
export function groupResults(hits: Partial<Record<SearchGroupKey, readonly SearchHit[]>>): SearchGroup[] {
  return GROUP_ORDER.flatMap((key) => {
    const seen = new Set<string>();
    const unique = (hits[key] ?? []).filter((h) => (seen.has(h.id) ? false : (seen.add(h.id), true)));
    return unique.length ? [{ key, label: GROUP_LABELS[key], hits: unique }] : [];
  });
}

export function resultCount(groups: readonly SearchGroup[]): number {
  return groups.reduce((sum, g) => sum + g.hits.length, 0);
}

/** Open lessons first, then alphabetical — locked ones still show so members know they exist. */
export function rankLessons<T extends { title: string; locked?: boolean }>(hits: readonly T[], q: string): T[] {
  const lower = q.toLowerCase();
  const score = (h: T) => (h.locked ? 2 : 0) + (h.title.toLowerCase().includes(lower) ? 0 : 1);
  return [...hits].sort((a, b) => score(a) - score(b) || a.title.localeCompare(b.title));
}

/** A short excerpt around the first match, for notes whose match is deep in the text. */
export function excerpt(text: string, q: string, radius = 50): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const at = clean.toLowerCase().indexOf(q.toLowerCase());
  if (at === -1 || clean.length <= radius * 2) return clean.slice(0, radius * 2);
  const start = Math.max(0, at - radius);
  const end = Math.min(clean.length, at + q.length + radius);
  return `${start > 0 ? "…" : ""}${clean.slice(start, end)}${end < clean.length ? "…" : ""}`;
}
