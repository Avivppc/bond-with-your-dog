"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isGroupActive, isNavItemActive, type AdminNav, type AdminNavEntry } from "@/lib/admin-nav";

const ROW = "flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-[7px] text-[14px] font-medium";
const IDLE = "text-[#3d3c3a] hover:bg-[#f3f3f2]";
const ACTIVE = "bg-[#efeeed] text-[#1a1a19]";

function Icon({ name }: { name: string }) {
  return (
    <span className="material-symbols-outlined text-[20px] text-[#4b4a48]" aria-hidden>
      {name}
    </span>
  );
}

function NavGroup({ entry, pathname, onNavigate }: { entry: AdminNavEntry; pathname: string; onNavigate?: () => void }) {
  // Open by itself while one of its pages is showing, until the person toggles it.
  const [toggled, setToggled] = useState<boolean | null>(null);
  const expanded = toggled ?? isGroupActive(entry, pathname);
  const id = `nav-${entry.label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <li>
      <button type="button" className={`${ROW} ${IDLE}`} aria-expanded={expanded} aria-controls={id} onClick={() => setToggled(!expanded)}>
        <Icon name={entry.icon} />
        <span className="flex-1 text-left">{entry.label}</span>
        <span className={`material-symbols-outlined text-[18px] text-[#6c6a69] transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden>
          expand_more
        </span>
      </button>
      {expanded && (
        <ul id={id} className="mt-0.5 space-y-0.5">
          {(entry.children ?? []).map((child) => {
            const active = isNavItemActive(child.href, pathname);
            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={`${ROW} pl-[42px] font-normal ${active ? ACTIVE : IDLE}`}
                >
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
}

function NavList({ entries, pathname, onNavigate }: { entries: readonly AdminNavEntry[]; pathname: string; onNavigate?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {entries.map((entry) => {
        if (entry.children) return <NavGroup key={entry.label} entry={entry} pathname={pathname} onNavigate={onNavigate} />;
        const href = entry.href ?? "/admin";
        const active = isNavItemActive(href, pathname);
        return (
          <li key={entry.label}>
            <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`${ROW} ${active ? ACTIVE : IDLE}`}>
              <Icon name={entry.icon} />
              {entry.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Kajabi's site switcher pill. There is one site, so it simply returns to the dashboard. */
function SiteSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/admin"
      onClick={onNavigate}
      className="mx-3 mt-3 flex items-center gap-2 rounded-full border border-[#e7e6e4] bg-white py-1.5 pl-1.5 pr-3 text-[14px] font-semibold text-[#1a1a19] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:bg-[#f8f8f8]"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1a1a19] text-xs font-bold text-white">B</span>
      <span className="truncate">Bonded Academy</span>
    </Link>
  );
}

function SidebarBody({ nav, onNavigate }: { nav: AdminNav; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <SiteSwitcher onNavigate={onNavigate} />
      <nav className="flex flex-1 flex-col justify-between overflow-y-auto px-3 py-4" aria-label="Admin">
        <NavList entries={nav.main} pathname={pathname} onNavigate={onNavigate} />
        <div className="mt-6 border-t border-[#efeeed] pt-3">
          <NavList entries={nav.bottom} pathname={pathname} onNavigate={onNavigate} />
        </div>
      </nav>
    </>
  );
}

/** Fixed 217px sidebar on desktop; a slide-over drawer behind the menu button on small screens. */
export function AdminSidebar({ nav }: { nav: AdminNav }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[217px] flex-col border-r border-[#ebeae8] bg-white lg:flex">
        <SidebarBody nav={nav} />
      </aside>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-40 rounded-[8px] border border-[#e7e6e4] bg-white p-1.5 lg:hidden"
        aria-label="Open menu"
      >
        <span className="material-symbols-outlined text-[20px]" aria-hidden>
          menu
        </span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-black/30" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col bg-white shadow-xl">
            <SidebarBody nav={nav} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
