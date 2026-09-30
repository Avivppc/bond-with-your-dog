"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AskCoachFab from "./AskCoachFab";

type Item = { href: string; label: string; icon: string; locked?: boolean };

const items: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/courses", label: "Training", icon: "pets" },
  { href: "/dashboard?expert=1", label: "Expert Track", icon: "psychology", locked: true },
  { href: "/dashboard#achievements", label: "Achievements", icon: "military_tech" },
  { href: "/community", label: "Community", icon: "forum" },
  { href: "/spotlight", label: "Spotlight", icon: "video_library" },
  { href: "/refer", label: "Refer a friend", icon: "card_giftcard" },
  { href: "/blog", label: "News", icon: "newspaper" },
];

const ITEM = "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition-all";

function isActive(pathname: string, href: string): boolean {
  if (href.includes("#") || href.includes("?")) return false;
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

/** Member portal sidebar (the original Bonded portal design: white rail, orange active pill). */
export default function MemberSidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col border-r border-slate-100 bg-white py-7 shadow-sm lg:flex" style={{ fontFamily: "var(--font-headline)" }}>
      <div className="mb-7 px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0e666a] text-[#c8fcff]">
            <span className="material-symbols-outlined" aria-hidden>
              pets
            </span>
          </span>
          <span>
            <span className="block text-lg font-black leading-none text-[#0e666a]">Member Portal</span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Bonded Academy</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        {items.map((it) =>
          it.locked ? (
            <div key={it.href} className={`${ITEM} cursor-not-allowed justify-between text-slate-400`} title="Coming soon">
              <span className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[20px]" aria-hidden>
                  {it.icon}
                </span>
                {it.label}
              </span>
              <span className="material-symbols-outlined text-sm" aria-hidden>
                lock
              </span>
            </div>
          ) : (
            <Link
              key={it.href}
              href={it.href}
              aria-current={isActive(pathname, it.href) ? "page" : undefined}
              className={`${ITEM} ${isActive(pathname, it.href) ? "translate-x-1 bg-orange-100/70 text-orange-900" : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"}`}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden>
                {it.icon}
              </span>
              {it.label}
            </Link>
          )
        )}
      </nav>

      <div className="mt-auto space-y-4 px-4">
        <AskCoachFab variant="sidebar" />
        <div className="space-y-1 border-t border-slate-100 pt-3">
          <Link href="/profile" className={`${ITEM} ${pathname === "/profile" ? "bg-orange-100/70 text-orange-900" : "text-slate-500 hover:bg-slate-50"}`}>
            <span className="material-symbols-outlined text-[20px]" aria-hidden>
              settings
            </span>
            Settings
          </Link>
          <form action="/auth/logout" method="post">
            <button type="submit" className={`${ITEM} w-full text-slate-500 hover:bg-slate-50`}>
              <span className="material-symbols-outlined text-[20px]" aria-hidden>
                logout
              </span>
              Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
