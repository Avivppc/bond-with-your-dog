/** Same rule as the `moves.slug` check constraint. */
export const MOVE_SLUG_PATTERN = /^[a-z0-9-]{2,60}$/;
const MAX_SLUG_LENGTH = 60;

/** "Café — Spin & Twist!" → "cafe-spin-twist" (lowercase letters, digits and single dashes). */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, "");
}
