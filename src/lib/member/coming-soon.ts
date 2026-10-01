/**
 * Member App sections that aren't open to members yet. Their menu items and every link to them
 * show "Soon" and can't be clicked, and the pages show a "coming soon" screen to members (the
 * team still sees them, to prepare the content). Remove a path here to open that section.
 */
export const COMING_SOON_SECTIONS = ["/moves", "/community"] as const;

export function isComingSoon(href: string): boolean {
  const path = href.split(/[?#]/)[0];
  return COMING_SOON_SECTIONS.some((section) => path === section || path.startsWith(`${section}/`));
}
