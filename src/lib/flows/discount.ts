/**
 * Personal upsell codes: one per member and chapter, a percentage off, valid until a date, used
 * once. Codes live in our database (PayPlus has no discount objects); checkout asks for the final
 * amount. Pure helpers; the database work is in src/lib/flows/server.
 */

/** No 0/O, 1/I/L: easy to read out from an email. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** "BOND-7KQ4-M2XD". `random` returns [0, 1); pass crypto-backed randomness in production. */
export function generateCode(random: () => number): string {
  const block = () => Array.from({ length: 4 }, () => ALPHABET[Math.floor(random() * ALPHABET.length)]).join("");
  return `BOND-${block()}-${block()}`;
}

export function normalizeCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export function discountedCents(priceCents: number, percent: number): number {
  return Math.max(0, Math.round((priceCents * (100 - percent)) / 100));
}

export interface CodeRecord {
  user_id: string;
  course_id: string;
  percent: number;
  expires_at: string;
  redeemed_at: string | null;
}

export type CodeCheck = { ok: true; percent: number } | { ok: false; reason: string };

/** Whether this member may use this code on this chapter now, with a member-facing reason when not. */
export function checkCode(code: CodeRecord | null, userId: string, courseIds: readonly string[], now: Date): CodeCheck {
  if (!code || code.user_id !== userId) return { ok: false, reason: "That code isn't valid for your account." };
  if (!courseIds.includes(code.course_id)) return { ok: false, reason: "That code is for a different chapter." };
  if (code.redeemed_at) return { ok: false, reason: "That code has already been used." };
  if (new Date(code.expires_at) <= now) return { ok: false, reason: "That code has expired." };
  return { ok: true, percent: code.percent };
}

export function formatUsd(cents: number): string {
  const dollars = cents / 100;
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;
}
