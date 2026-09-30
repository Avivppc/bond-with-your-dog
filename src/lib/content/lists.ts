/**
 * Helpers for the admin "list editors" (takeaways, cues, move steps…). The editors submit one
 * form field per row with the same name, so the server reads them with `formData.getAll(name)`.
 */
export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

export interface TextListOptions {
  /** Used in error messages, e.g. "Key takeaways". */
  label: string;
  maxItems: number;
  maxLength: number;
}

/** Trimmed, non-blank rows in their submitted order, or a friendly error. */
export function parseTextList(raw: readonly unknown[], { label, maxItems, maxLength }: TextListOptions): ParseResult<string[]> {
  const items = raw.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean);
  if (items.length > maxItems) return { ok: false, error: `${label}: up to ${maxItems} items.` };
  if (items.some((item) => item.length > maxLength)) {
    return { ok: false, error: `${label}: keep each item under ${maxLength} characters.` };
  }
  return { ok: true, value: items };
}

/** Reads a text[] / jsonb string array from the database, ignoring anything else. */
export function readTextList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim() !== "");
}
