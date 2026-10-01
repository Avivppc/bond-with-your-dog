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
 * Pages both sides share: the doorway from the site into the app.
 * Where they belong decides where the signup → purchase funnel is cut.
 */
export const SHARED_ROUTE_SEGMENTS = [
  "login",
  "signup",
  "forgot-password",
  "reset-password",
  "checkout",
  "auth",
] as const;

const APP_SEGMENTS: ReadonlySet<string> = new Set(APP_ROUTE_SEGMENTS);
const SHARED_SEGMENTS: ReadonlySet<string> = new Set(SHARED_ROUTE_SEGMENTS);

function firstSegment(pathname: string): string {
  return pathname.split("/").find(Boolean) ?? "";
}

export function surfaceForPath(pathname: string): Surface {
  const segment = firstSegment(pathname);
  if (segment === "admin") return "admin";
  if (APP_SEGMENTS.has(segment)) return "app";

  // TODO(Aviv): which surface do login, signup, password reset and checkout belong to?
  //   SHARED_SEGMENTS.has(segment) tells you the page is one of them.
  //   - "site": the site funnel (quiz → plan click → signup → purchase) stays in one place,
  //     and the app's numbers start only once the member is inside.
  //   - "app": the app owns the whole account journey, and the site ends at the plan click.
  void SHARED_SEGMENTS;
  return "site";
}
