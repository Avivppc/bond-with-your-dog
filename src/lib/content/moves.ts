/** Pure helpers for the Moves Library CMS. */
export const MOVE_IMAGE_PREFIX = "moves/";
const IMAGE_FILE = /^moves\/[a-z0-9-]+\.(jpg|jpeg|png|webp)$/;

export interface SearchableMove {
  name: string;
  slug: string;
  cue: string | null;
}

/** Case-insensitive match on name, slug or cue; a blank query matches everything. */
export function matchesMoveSearch(move: SearchableMove, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [move.name, move.slug, move.cue ?? ""].some((field) => field.toLowerCase().includes(q));
}

/** Storage path in the public course-images bucket: moves/<id>.<ext>. */
export function moveImagePath(fileName: string, uniqueId: string): string {
  const ext = fileName.slice(fileName.lastIndexOf(".") + 1).toLowerCase();
  return `${MOVE_IMAGE_PREFIX}${uniqueId}.${ext}`;
}

/** Storage path for a public URL of our moves/ folder, or null for any other URL. */
export function moveImagePathFromUrl(url: string, publicBase: string): string | null {
  if (!url.startsWith(publicBase)) return null;
  const path = url.slice(publicBase.length);
  return IMAGE_FILE.test(path) ? path : null;
}

/** Only images uploaded through the Moves editor may be saved on a move. */
export function isMoveImageUrl(url: string, publicBase: string): boolean {
  return moveImagePathFromUrl(url, publicBase) !== null;
}
