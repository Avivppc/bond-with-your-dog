import { canPerform, type StaffCapability, type StaffRole } from "./staff";

/**
 * Admin sidebar, laid out like Kajabi's: top-level entries with icons, where groups expand
 * with a chevron (Products ▾, Sales ▾ …). Settings and "View member app" sit at the bottom.
 * Icons are Material Symbols.
 */
export interface AdminNavLink {
  href: string;
  label: string;
}

export interface AdminNavEntry {
  label: string;
  icon: string;
  /** A plain link (Dashboard) … */
  href?: string;
  /** … or an expandable group (Products ▾). */
  children?: AdminNavLink[];
}

export interface AdminNav {
  main: AdminNavEntry[];
  bottom: AdminNavEntry[];
}

interface NavChild extends AdminNavLink {
  needs: StaffCapability;
}

interface NavDef {
  label: string;
  icon: string;
  href?: string;
  needs?: StaffCapability;
  children?: NavChild[];
}

const MAIN: NavDef[] = [
  { label: "Dashboard", icon: "home", href: "/admin", needs: "content" },
  {
    label: "Products",
    icon: "inventory_2",
    children: [
      { href: "/admin/products", label: "All Products", needs: "content" },
      { href: "/admin/courses", label: "Courses", needs: "content" },
      { href: "/admin/moves", label: "Moves Library", needs: "content" },
      { href: "/admin/assessments", label: "Assessments", needs: "content" },
      { href: "/admin/community", label: "Community", needs: "content" },
    ],
  },
  {
    label: "Website",
    icon: "language",
    children: [
      { href: "/admin/website", label: "Pages", needs: "content" },
      { href: "/site-editor/theme", label: "Theme", needs: "content" },
      { href: "/site-editor/member", label: "Member area", needs: "content" },
      { href: "/admin/media", label: "Media library", needs: "content" },
    ],
  },
  {
    label: "Sales",
    icon: "sell",
    children: [
      { href: "/admin/pricing", label: "Chapter prices", needs: "sales" },
      { href: "/admin/offers", label: "Offers", needs: "sales" },
      { href: "/admin/orders", label: "Orders", needs: "sales" },
      { href: "/admin/referrals", label: "Referrals", needs: "sales" },
      { href: "/admin/affiliates", label: "Affiliates", needs: "sales" },
    ],
  },
  {
    label: "Marketing",
    icon: "campaign",
    children: [
      { href: "/admin/email-flows", label: "Email flows", needs: "sales" },
      { href: "/admin/campaigns", label: "Campaigns", needs: "sales" },
      { href: "/admin/coupons", label: "Coupons", needs: "sales" },
      { href: "/admin/discount-codes", label: "Discount codes", needs: "sales" },
    ],
  },
  {
    label: "Coaching",
    icon: "sports",
    children: [
      { href: "/studio", label: "Roni's Studio", needs: "content" },
      { href: "/admin/coaching/questions", label: "Lesson questions", needs: "content" },
      { href: "/admin/coaching/live-qa", label: "Live Q&A", needs: "content" },
      { href: "/admin/coaching/replies", label: "Saved replies", needs: "content" },
      { href: "/admin/assistant", label: "AI assistant", needs: "content" },
    ],
  },
  {
    label: "Contacts",
    icon: "group",
    children: [
      { href: "/admin/people", label: "All Contacts", needs: "sales" },
      { href: "/admin/insights", label: "Insights", needs: "sales" },
      { href: "/admin/leads", label: "Leads", needs: "sales" },
      { href: "/admin/inbox", label: "Inbox", needs: "sales" },
    ],
  },
  {
    label: "Analytics",
    icon: "bar_chart",
    children: [
      { href: "/admin/analytics", label: "Analytics", needs: "sales" },
      { href: "/admin/reports", label: "Reports", needs: "sales" },
    ],
  },
];

const BOTTOM: NavDef[] = [
  {
    label: "Settings",
    icon: "settings",
    children: [
      { href: "/admin/settings/general", label: "General", needs: "settings" },
      { href: "/admin/settings/member-notifications", label: "Member notifications", needs: "content" },
      { href: "/admin/settings/certificate", label: "Certificate", needs: "content" },
      { href: "/admin/settings/notifications", label: "Team notifications", needs: "sales" },
      { href: "/admin/settings/email", label: "Email", needs: "sales" },
      { href: "/admin/settings/payments", label: "Payments", needs: "settings" },
      { href: "/admin/team", label: "Users & access", needs: "staff" },
    ],
  },
  { label: "View member app", icon: "open_in_new", href: "/home", needs: "content" },
];

function visible(defs: readonly NavDef[], role: StaffRole): AdminNavEntry[] {
  return defs.flatMap((def): AdminNavEntry[] => {
    if (def.children) {
      const children = def.children.filter((c) => canPerform(role, c.needs)).map(({ href, label }) => ({ href, label }));
      return children.length > 0 ? [{ label: def.label, icon: def.icon, children }] : [];
    }
    if (!def.href || (def.needs && !canPerform(role, def.needs))) return [];
    return [{ label: def.label, icon: def.icon, href: def.href }];
  });
}

/** The sidebar a staff member sees; groups with nothing permitted are dropped. */
export function adminNavFor(role: StaffRole): AdminNav {
  return { main: visible(MAIN, role), bottom: visible(BOTTOM, role) };
}

/** The dashboard is active only on /admin itself; every other item also covers its sub-pages. */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** A group opens by itself when one of its pages is showing. */
export function isGroupActive(entry: AdminNavEntry, pathname: string): boolean {
  return (entry.children ?? []).some((c) => isNavItemActive(c.href, pathname));
}
