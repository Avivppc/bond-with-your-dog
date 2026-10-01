/** Admin list search boxes. Pure. */

export const MAX_SEARCH_LENGTH = 100;

/** A single trimmed search term from a query string ("" when missing or repeated). */
export function parseSearch(raw: string | string[] | undefined): string {
  return typeof raw === "string" ? raw.trim().slice(0, MAX_SEARCH_LENGTH) : "";
}

/**
 * The term as a PostgREST `ilike` pattern for an `.or(...)` filter: characters that carry meaning
 * there (commas, parentheses, quotes, wildcards, backslashes) are dropped, so input can't change the filter.
 */
export function ilikePattern(term: string): string | null {
  const safe = term.replace(/[,()"'%*_\\:]/g, " ").replace(/\s+/g, " ").trim();
  return safe ? `*${safe}*` : null;
}
