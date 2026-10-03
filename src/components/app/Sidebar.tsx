"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActive, type MemberNavItem } from "./nav";
import { Ms } from "./ui";
import { SoonPill } from "./SoonLink";
import { isComingSoon } from "@/lib/member/coming-soon";

interface SidebarProps {
  isStaff: boolean;
  /** The menu from Website → Member area (built-in pages and custom links). */
  nav: MemberNavItem[];
  foot: MemberNavItem[];
  logo: string;
}

const isExternal = (href: string) => /^(https?:|mailto:)/.test(href);

/** Left rail on desktop (logo, main nav, Ask Roni, settings/help, team links). */
export function Sidebar({ isStaff, nav, foot, logo }: SidebarProps) {
  const pathname = usePathname();
  return (
    <aside className="sidebar" aria-label="Main" data-tour="sidebar">
      <div className="brand">
        <Link href="/home" aria-label="Bonded home">
          {/* eslint-disable-next-line @next/next/no-img-element -- brand logo */}
          <img src={logo} alt="Bonded" />
        </Link>
        <span className="member-pill">Member</span>
      </div>
      <nav className="nav">
        {nav.map((item) => {
          const active = isActive(item, pathname);
          if (isExternal(item.href)) {
            return (
              <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">
                <Ms name={item.icon} />
                {item.label}
                <Ms name="open_in_new" size="sm" />
              </a>
            );
          }
          if (isComingSoon(item.href)) {
            return (
              <span key={item.href} className="nav-soon" aria-disabled="true" title="Coming soon">
                <Ms name={item.icon} />
                {item.label}
                <SoonPill />
              </span>
            );
          }
          return (
            <Link key={item.href} href={item.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined} data-tour={`nav-${item.icon}`}>
              <Ms name={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="side-foot">
        <Link className="btn btn-teal" href="/feedback/new" data-tour="ask-roni">
          <Ms name="support_agent" />
          Ask Roni
        </Link>
        <div className="small-links">
          {foot.map((item) => (
            <Link key={item.href} href={item.href} className={isActive(item, pathname) ? "active" : undefined}>
              <Ms name={item.icon} size="sm" />
              {item.label}
            </Link>
          ))}
          {isStaff && (
            <>
              <Link href="/studio" className={pathname.startsWith("/studio") ? "active" : undefined}>
                <Ms name="verified_user" size="sm" />
                Roni&apos;s Studio
              </Link>
              <Link href="/admin">
                <Ms name="admin_panel_settings" size="sm" />
                Admin
              </Link>
            </>
          )}
          <form action="/auth/logout" method="post">
            <button type="submit" className="sign-out">
              <Ms name="logout" size="sm" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

/** Bottom tab bar on phones. */
export function Tabbar({ tabs }: { tabs: MemberNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map((item) => {
        const active = isActive(item, pathname);
        return (
          <Link key={item.href} href={item.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined}>
            <Ms name={item.icon} />
            {item.label === "My Chapters" ? "Chapters" : item.label}
          </Link>
        );
      })}
    </nav>
  );
}
