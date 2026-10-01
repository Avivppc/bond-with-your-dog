/**
 * Which part of Bonded an event happened in. Every event carries it as the
 * `surface` property, so each PostHog funnel, dashboard and replay list can be
 * split into the public site, the member app and the staff admin.
 *
 * The member app lives at the root (/home, /learn, ...) through the (member)
 * route group, so the URL prefix is the only reliable signal in the browser.
 */
export type Surface = "site" | "app" | "admin";

/**
 * First path segment of every member-app screen: the folders under
 * src/app/(member) and src/app/(onboarding). A test fails when a new folder is
 * added there without being listed here.
 */
export const APP_ROUTE_SEGMENTS = [
  "certificates",
  "community",
  "dogs",
  "feedback",
  "help",
  "home",
  "learn",
  "membership",
  "moves",
  "my-courses",
  "notifications",
  "plan",
  "practice",
  "profile",
  "progress",
  "refer",
  "routine",
  "search",
  "settings",
  "studio",
  "welcome",
] as const;

/**
 * Pages outside the route groups that still count as the app. Login is the
 * members' front door; signup, password reset and checkout stay with the site
 * so its funnel runs unbroken from quiz to purchase.
 */
export const APP_ENTRY_SEGMENTS = ["login"] as const;

const APP_SEGMENTS: ReadonlySet<string> = new Set([...APP_ROUTE_SEGMENTS, ...APP_ENTRY_SEGMENTS]);

function firstSegment(pathname: string): string {
  return pathname.split("/").find(Boolean) ?? "";
}

export function surfaceForPath(pathname: string): Surface {
  const segment = firstSegment(pathname);
  if (segment === "admin") return "admin";
  if (APP_SEGMENTS.has(segment)) return "app";
  return "site";
}
