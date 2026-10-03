import { z } from "zod";
import { normalizeTag } from "./flows/actions";

/**
 * Contacts → Import: turns a spreadsheet (a Kajabi export or any CSV) into rows for the database.
 * Pure: the browser runs it for the preview, the server checks the rows again.
 */

export const IMPORT_FIELDS = ["email", "name", "firstName", "lastName", "tags", "subscribed"] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
/** Which column (by index) feeds each field; null = not imported. */
export type ColumnMapping = Record<ImportField, number | null>;

export const FIELD_LABEL: Record<ImportField, string> = {
  email: "Email",
  name: "Full name",
  firstName: "First name",
  lastName: "Last name",
  tags: "Tags",
  subscribed: "Newsletter consent",
};

/** Header names we recognise, Kajabi's included. Checked in order; the first match per field wins. */
const GUESSES: Record<ImportField, RegExp> = {
  email: /^(e-?mail|email address|e-?mail address)$/i,
  name: /^(name|full name|contact name)$/i,
  firstName: /^(first(\s|_)?name|given name)$/i,
  lastName: /^(last(\s|_)?name|surname|family name)$/i,
  tags: /^tags?$/i,
  subscribed: /(subscri|opt(ed)?[\s_-]?in|newsletter|marketing|accepts?[\s_-]?(email|marketing))/i,
};

export function guessMapping(headers: readonly string[]): ColumnMapping {
  const used = new Set<number>();
  const pick = (field: ImportField): number | null => {
    const i = headers.findIndex((h, idx) => !used.has(idx) && GUESSES[field].test(h.trim()));
    if (i === -1) return null;
    used.add(i);
    return i;
  };
  // Email first so a header like "Email marketing" can't take its place.
  const email = pick("email");
  return { email, name: pick("name"), firstName: pick("firstName"), lastName: pick("lastName"), tags: pick("tags"), subscribed: pick("subscribed") };
}

const YES = /^(true|yes|y|1|subscribed|opted in|opt-in|on|active)$/i;
const NO = /^(false|no|n|0|unsubscribed|opted out|opt-out|off|inactive|never subscribed|not subscribed)$/i;

/**
 * A consent cell → true / false / null (unknown, keep what's saved). A column named like
 * "Unsubscribed" flips the meaning.
 */
export function readConsent(cell: string, header: string): boolean | null {
  const value = cell.trim();
  const flipped = /unsubscri|opt(ed)?[\s_-]?out/i.test(header);
  const answer = YES.test(value) ? true : NO.test(value) ? false : null;
  return answer === null ? null : flipped ? !answer : answer;
}

/** "dog-dance, vip;Puppy Class" → ["dog-dance", "vip", "puppy class"], dropping what isn't a valid tag. */
export function splitTags(cell: string): string[] {
  return [...new Set(cell.split(/[,;|]/).map(normalizeTag).filter(Boolean))];
}

export interface ImportRow {
  email: string;
  name: string | null;
  subscribed: boolean | null;
  tags: string[];
}

export interface BuiltImport {
  rows: ImportRow[];
  /** 1-based spreadsheet line numbers (header = line 1) whose email is missing or invalid. */
  invalidLines: number[];
  /** Emails that appeared more than once (the first one is kept). */
  duplicates: number;
}

const Email = z.email();
const MAX_NAME = 120;

function cellAt(row: readonly string[], index: number | null): string {
  return index === null ? "" : (row[index] ?? "").trim();
}

/** Data rows (without the header) → import rows, plus what was skipped. */
export function buildImport(headers: readonly string[], data: readonly (readonly string[])[], mapping: ColumnMapping, extraTags: readonly string[]): BuiltImport {
  const seen = new Set<string>();
  const extra = extraTags.map(normalizeTag).filter(Boolean);
  const consentHeader = mapping.subscribed === null ? "" : (headers[mapping.subscribed] ?? "");
  // Local arrays (not copied per row): a Kajabi export can have tens of thousands of lines.
  const rows: ImportRow[] = [];
  const invalidLines: number[] = [];
  let duplicates = 0;
  data.forEach((row, i) => {
    const email = cellAt(row, mapping.email).toLowerCase().replace(/^<|>$/g, "");
    if (!Email.safeParse(email).success) {
      invalidLines.push(i + 2);
      return;
    }
    if (seen.has(email)) {
      duplicates++;
      return;
    }
    seen.add(email);
    const full = cellAt(row, mapping.name) || [cellAt(row, mapping.firstName), cellAt(row, mapping.lastName)].filter(Boolean).join(" ");
    const tags = [...new Set([...splitTags(cellAt(row, mapping.tags)), ...extra])];
    const subscribed = mapping.subscribed === null ? null : readConsent(cellAt(row, mapping.subscribed), consentHeader);
    rows.push({ email, name: full ? full.slice(0, MAX_NAME) : null, subscribed, tags });
  });
  return { rows, invalidLines, duplicates };
}

/** What the server accepts per request (the browser sends a big file in batches of this size). */
export const IMPORT_BATCH = 200;
export const MAX_IMPORT_ROWS = 20_000;

export const importRowSchema = z.object({
  email: z.email().max(320),
  name: z.string().trim().max(MAX_NAME).nullable(),
  subscribed: z.boolean().nullable(),
  tags: z.array(z.string().max(40)).max(30),
});
