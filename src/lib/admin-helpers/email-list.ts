import { z } from "zod";

/** "Add contacts": a pasted list of emails (commas, semicolons, spaces or new lines). Pure. */
export const MAX_EMAILS_PER_BATCH = 200;

export interface ParsedEmailList {
  /** Valid, lower-cased, de-duplicated, in the order given. */
  emails: string[];
  /** Entries that aren't email addresses (as typed). */
  invalid: string[];
  /** More than MAX_EMAILS_PER_BATCH valid addresses were given. */
  tooMany: boolean;
}

const Email = z.email();

export function parseEmailList(text: string, max: number = MAX_EMAILS_PER_BATCH): ParsedEmailList {
  const entries = text
    .split(/[\s,;]+/)
    .map((e) => e.trim().replace(/^<|>$/g, ""))
    .filter(Boolean);
  const seen = new Set<string>();
  const invalid: string[] = [];
  for (const entry of entries) {
    const email = entry.toLowerCase();
    if (!Email.safeParse(email).success) invalid.push(entry);
    else seen.add(email);
  }
  const emails = [...seen];
  return { emails: emails.slice(0, max), invalid, tooMany: emails.length > max };
}
