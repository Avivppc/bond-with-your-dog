import { canPerform, type StaffCapability, type StaffRole } from "./staff";

/** Admin sidebar, grouped like Kajabi's (Products / Sales / Contacts …). Icons are Material Symbols. */
export interface AdminNavItem {
  href: string;
  label: string;
  icon: string;
}

export interface AdminNavGroup {
  label: string | null;
  items: AdminNavItem[];
}

interface NavEntry extends AdminNavItem {
  needs: StaffCapability;
}

const NAV: { label: string | null; items: NavEntry[] }[] = [
  { label: null, items: [{ href: "/admin", label: "Dashboard", icon: "space_dashboard", needs: "content" }] },
  {
    label: "Products",
    items: [
      { href: "/admin/courses", label: "Courses", icon: "school", needs: "content" },
      { href: "/admin/offers", label: "Offers", icon: "sell", needs: "sales" },
    ],
  },
  {
    label: "Sales",
    items: [
      { href: "/admin/orders", label: "Orders", icon: "receipt_long", needs: "sales" },
      { href: "/admin/referrals", label: "Referrals", icon: "card_giftcard", needs: "sales" },
    ],
  },
  {
    label: "Contacts",
    items: [
      { href: "/admin/students", label: "Students", icon: "group", needs: "sales" },
      { href: "/admin/leads", label: "Leads", icon: "contact_mail", needs: "sales" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/admin/analytics", label: "Overview", icon: "monitoring", needs: "sales" },
      { href: "/admin/reports", label: "Reports", icon: "description", needs: "sales" },
    ],
  },
  { label: "Community", items: [{ href: "/admin/videos", label: "Spotlight queue", icon: "video_library", needs: "content" }] },
  { label: "Settings", items: [{ href: "/admin/team", label: "Team", icon: "badge", needs: "staff" }] },
];

export function adminNavFor(role: StaffRole): AdminNavGroup[] {
  return NAV.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => canPerform(role, item.needs)).map(({ href, label, icon }) => ({ href, label, icon })),
  })).filter((group) => group.items.length > 0);
}

/** The dashboard is active only on /admin itself; every other item also covers its sub-pages. */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
