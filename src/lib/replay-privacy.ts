/**
 * Session replay masks every input by default. Text that is already on the page
 * can be just as private: notes to Roni and her replies, support messages,
 * account details. On these pages all text is masked in replays.
 */
const PRIVATE_TEXT_PREFIXES = [
  "/feedback",
  "/studio",
  "/help",
  "/settings",
  "/profile",
  "/admin/inbox",
  "/admin/coaching",
  "/admin/people",
] as const;

export function showsPrivateText(pathname: string): boolean {
  return PRIVATE_TEXT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function maskReplayText(text: string, pathname: string): string {
  return showsPrivateText(pathname) ? "*".repeat(text.length) : text;
}
