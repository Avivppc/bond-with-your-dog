/**
 * The admin top bar's notifications bell: what is waiting for the team, coaching first.
 * Pure (counts in, menu items out) so it can be tested without the database.
 */
export interface AdminAlertCounts {
  videos: number;
  replies: number;
  lessonQuestions: number;
  liveQuestions: number;
  postsToReview: number;
  /** Open inbox requests; null when the viewer can't open the inbox. */
  inbox: number | null;
}

export interface AdminAlert {
  key: keyof AdminAlertCounts;
  label: string;
  count: number;
  href: string;
  icon: string;
}

interface AlertDef {
  key: keyof AdminAlertCounts;
  one: string;
  many: string;
  href: string;
  icon: string;
}

const DEFS: readonly AlertDef[] = [
  { key: "videos", one: "video to review", many: "videos to review", href: "/studio", icon: "video_camera_front" },
  { key: "replies", one: "member wrote back on a video", many: "members wrote back on videos", href: "/studio", icon: "forum" },
  { key: "lessonQuestions", one: "lesson question", many: "lesson questions", href: "/admin/coaching/questions", icon: "help" },
  { key: "liveQuestions", one: "Live Q&A question", many: "Live Q&A questions", href: "/admin/coaching/live-qa", icon: "live_tv" },
  { key: "postsToReview", one: "community post to review", many: "community posts to review", href: "/admin/community?tab=moderation", icon: "shield" },
  { key: "inbox", one: "open inbox message", many: "open inbox messages", href: "/admin/inbox", icon: "inbox" },
];

export function buildAdminAlerts(counts: AdminAlertCounts): { items: AdminAlert[]; total: number } {
  const items = DEFS.flatMap((d): AdminAlert[] => {
    const count = counts[d.key] ?? 0;
    return count > 0 ? [{ key: d.key, label: `${count} ${count === 1 ? d.one : d.many}`, count, href: d.href, icon: d.icon }] : [];
  });
  return { items, total: items.reduce((sum, i) => sum + i.count, 0) };
}

const BADGE_MAX = 99;

/** The red badge text; null hides it. */
export function badgeLabel(total: number): string | null {
  if (total <= 0) return null;
  return total > BADGE_MAX ? `${BADGE_MAX}+` : String(total);
}
