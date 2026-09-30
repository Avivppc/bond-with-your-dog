/** Member App navigation — one source for the sidebar, the phone tab bar and the active state. */
export interface MemberNavItem {
  href: string;
  label: string;
  icon: string;
  /** Path prefixes that light this item up. */
  match: string[];
}

export const MEMBER_NAV: MemberNavItem[] = [
  { href: "/home", label: "Home", icon: "home", match: ["/home", "/notifications"] },
  { href: "/my-courses", label: "My Courses", icon: "school", match: ["/my-courses", "/learn", "/certificates"] },
  { href: "/practice", label: "Practice", icon: "pets", match: ["/practice", "/plan", "/routine"] },
  { href: "/moves", label: "Moves Library", icon: "auto_stories", match: ["/moves", "/search"] },
  { href: "/feedback", label: "Feedback", icon: "rate_review", match: ["/feedback"] },
  { href: "/progress", label: "Progress", icon: "insights", match: ["/progress"] },
  { href: "/community", label: "Community", icon: "groups", match: ["/community", "/refer", "/spotlight"] },
];

export const MEMBER_FOOT_NAV: MemberNavItem[] = [
  { href: "/settings", label: "Settings", icon: "settings", match: ["/settings", "/profile", "/dogs", "/membership"] },
  { href: "/help", label: "Help", icon: "help", match: ["/help"] },
];

/** Phone tab bar: the five most used places. */
export const MEMBER_TABS = ["/home", "/my-courses", "/practice", "/feedback", "/progress"];

export function isActive(item: MemberNavItem, pathname: string): boolean {
  return item.match.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
