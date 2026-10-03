/** Page addresses for the website editor. Pure, no imports. */

/**
 * Addresses a new page can't take: every route the app already has (public, member, admin and
 * technical), so a page can never hide one. Kept in sync with src/app by a test.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  // public site and account
  "about", "account-deleted", "auth", "blog", "chapter", "checkout", "courses", "dashboard", "forgot-password", "login",
  "privacy", "quiz", "r", "refund-policy", "reset-password", "signup", "spotlight", "stories", "terms", "unsubscribe", "welcome",
  // member area
  "certificates", "community", "dogs", "feedback", "help", "home", "learn", "membership", "moves", "my-courses", "notifications",
  "plan", "practice", "profile", "progress", "refer", "routine", "search", "settings", "studio", "surveys",
  // staff and technical
  "admin", "api", "site-editor", "site-preview", "images", "sketches", "tails", "favicon", "robots", "sitemap", "icon", "apple-icon",
]);

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const MAX_SLUG = 60;

/** "My Workshop 2027!" → "my-workshop-2027". */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG)
    .replace(/-+$/, "");
}

/** Why a new page can't use this address, or null when it can. */
export function slugProblem(slug: string): string | null {
  if (!slug) return "Add the page address.";
  if (slug.length > MAX_SLUG || !SLUG.test(slug)) return "Addresses use lowercase letters, numbers and dashes, like workshop-2027.";
  if (RESERVED_SLUGS.has(slug)) return `bonded.dog/${slug} is already a page of the app. Pick another address.`;
  return null;
}
