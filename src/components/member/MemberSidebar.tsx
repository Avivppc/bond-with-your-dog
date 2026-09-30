"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: string; locked?: boolean };

const items: Item[] = [
  { href: "/dashboard", label: "My courses", icon: "school" },
  { href: "/courses", label: "All courses", icon: "pets" },
  { href: "/dashboard?expert=1", label: "Expert Track", icon: "psychology", locked: true },
  { href: "/dashboard#achievements", label: "Achievements", icon: "military_tech" },
  { href: "/community", label: "Spotlight", icon: "video_library" },
  { href: "/refer", label: "Refer a friend", icon: "card_giftcard" },
  { href: "/blog", label: "News", icon: "newspaper" },
];

const TEAL = "#0e666a";

/** Member portal sidebar — same teal theme as the course pages (Bonded's Kajabi look). */
export default function MemberSidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 flex-col gap-y-2 py-7 text-white lg:flex" style={{ backgroundColor: TEAL }}>
      <div className="mb-6 px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ff8f00] text-lg font-extrabold">B</span>
          <span>
            <span className="block text-lg font-extrabold leading-none" style={{ fontFamily: "var(--font-headline)" }}>
              Bonded
            </span>
            <span className="mt-1 block text-[11px] font-semibold text-white/70">Member portal</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map((it) => {
          const active = pathname === it.href;
          if (it.locked) {
            return (
              <div key={it.href} className="flex cursor-not-allowed items-center justify-between rounded-[12px] px-4 py-2.5 text-sm font-semibold text-white/40">
                <span className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px]">{it.icon}</span> {it.label}
                </span>
                <span className="material-symbols-outlined text-sm">lock</span>
              </div>
            );
          }
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-[12px] px-4 py-2.5 text-sm font-semibold transition-colors ${
                active ? "bg-white" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
              style={active ? { color: TEAL } : undefined}
            >
              <span className="material-symbols-outlined text-[20px]">{it.icon}</span> {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1 border-t border-white/15 px-3 pt-4">
        <Link href="/profile" className="flex items-center gap-3 rounded-[12px] px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">
          <span className="material-symbols-outlined text-[20px]">settings</span> Profile & settings
        </Link>
        <form action="/auth/logout" method="post">
          <button type="submit" className="flex w-full items-center gap-3 rounded-[12px] px-4 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white">
            <span className="material-symbols-outlined text-[20px]">logout</span> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
