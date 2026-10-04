/** Which paths belong to the member app. Pure, so the proxy and tests share one list. */

/** Signed-in member pages: the proxy sends visitors without a session to /login. */
export const MEMBER_PREFIXES = [
  "/dashboard",
  "/home",
  "/welcome",
  "/my-courses",
  "/learn",
  "/certificates",
  "/practice",
  "/plan",
  "/routine",
  "/moves",
  "/search",
  "/feedback",
  "/progress",
  "/community",
  "/refer",
  "/profile",
  "/dogs",
  "/settings",
  "/membership",
  "/notifications",
  "/help",
  "/studio",
] as const;

export function isMemberPath(pathname: string): boolean {
  return MEMBER_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
