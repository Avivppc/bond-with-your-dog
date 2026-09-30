"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive, type AdminNavGroup } from "@/lib/admin-nav";

function NavLinks({ groups, onNavigate }: { groups: readonly AdminNavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Admin">
      {groups.map((group) => (
        <div key={group.label ?? "main"}>
          {group.label && <p className="mb-1 px-3 text-xs font-medium text-[#8a8886]">{group.label}</p>}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isNavItemActive(item.href, pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-[8px] px-3 py-1.5 text-sm font-medium ${
                      active ? "bg-[#efeeed] text-[#1a1a19]" : "text-[#3d3c3a] hover:bg-[#f5f5f4]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]" aria-hidden>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="mx-3 mt-3 flex items-center gap-2 rounded-[8px] bg-[#f3f3f2] px-2.5 py-2 text-sm font-semibold text-[#1a1a19]">
      <span className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#1a1a19] text-xs font-bold text-white">B</span>
      Bonded Academy
    </Link>
  );
}

/** Fixed sidebar on desktop; a slide-over drawer behind the menu button on small screens. */
export function AdminSidebar({ groups }: { groups: readonly AdminNavGroup[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[#ebeae8] bg-white lg:flex">
        <Brand />
        <NavLinks groups={groups} />
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
            <Brand />
            <NavLinks groups={groups} onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
