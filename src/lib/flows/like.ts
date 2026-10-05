/**
 * An exact, case-insensitive match for `.ilike()`: `%` and `_` in an email address are ordinary
 * characters, not wildcards.
 */
export function exactLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}
