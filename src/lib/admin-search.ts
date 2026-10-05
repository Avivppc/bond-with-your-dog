import type { AdminNav } from "./admin-nav";

/**
 * Admin quick search (⌘K): admin screens are matched in the browser from the role's nav; contacts,
 * courses, lessons and the rest come from the server. Pure helpers shared by both sides.
 */

export interface SearchHit {
  label: string;
  href: string;
  /** Material Symbols name. */
  icon: string;
  /** A second line: the course of a lesson, a contact's email… */
  detail?: string;
}

export interface SearchGroup {
  group: string;
  hits: SearchHit[];
}

export interface IndexedHit extends SearchHit {
  group: string;
  /** Position across all groups, for arrow keys. */
  index: number;
}

export const SEARCH_MAX_LENGTH = 80;
const SEARCH_MIN_LENGTH = 2;

/** The cleaned search, or null when it is too short to send to the database. */
export function searchTerm(raw: string): string | null {
  const term = raw.trim().replace(/\s+/g, " ").slice(0, SEARCH_MAX_LENGTH);
  return term.length >= SEARCH_MIN_LENGTH ? term : null;
}

/**
 * An ilike pattern for "contains term". % and _ are escaped; commas, parentheses and quotes
 * (PostgREST's or() syntax) become spaces so a search can never change the filter.
 */
export function likePattern(term: string): string {
  const safe = term.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/[,()"]/g, " ");
  return `%${safe}%`;
}

/** Admin screens whose name (or group name) contains the search. */
export function navHits(nav: AdminNav, raw: string): SearchHit[] {
  const q = raw.trim().toLowerCase();
  if (!q) return [];
  return [...nav.main, ...nav.bottom].flatMap((entry) => {
    const links = entry.children ?? (entry.href ? [{ href: entry.href, label: entry.label }] : []);
    const groupMatches = entry.label.toLowerCase().includes(q);
    return links
      .filter((link) => groupMatches || link.label.toLowerCase().includes(q))
      .map((link) => ({ label: link.label, href: link.href, icon: entry.icon, detail: entry.children ? entry.label : undefined }));
  });
}

/** Groups in order, flattened with a running index. */
export function flattenHits(groups: readonly SearchGroup[]): IndexedHit[] {
  let index = 0;
  return groups.flatMap((g) => g.hits.map((hit) => ({ ...hit, group: g.group, index: index++ })));
}
