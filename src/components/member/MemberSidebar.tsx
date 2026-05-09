"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: string; locked?: boolean };

const items: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/courses", label: "Training", icon: "pets" },
  { href: "/dashboard?expert=1", label: "Expert Track", icon: "psychology", locked: true },
  { href: "/dashboard#achievements", label: "Achievements", icon: "military_tech" },
  { href: "/community", label: "Spotlight", icon: "video_library" },
  { href: "/blog", label: "News", icon: "newspaper" },
];

export default function MemberSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex h-screen w-64 fixed left-0 top-0 flex-col bg-white border-r border-slate-100 shadow-sm py-8 gap-y-2 z-40">
      <div className="px-6 mb-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#0e666a] flex items-center justify-center text-[#c8fcff]">
            <span className="material-symbols-outlined">pets</span>
          </div>
          <div>
            <h2 className="text-lg font-black leading-none" style={{ color: "#0e666a", fontFamily: "var(--font-headline)" }}>
              Member Portal
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Keta Tov Academy
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {items.map((it) => {
          const active = pathname === it.href || (it.href === "/dashboard" && pathname === "/dashboard");
          if (it.locked) {
            return (
              <div
                key={it.href}
                className="px-4 py-3 flex items-center justify-between rounded-full text-sm font-semibold opacity-60 cursor-not-allowed text-slate-500"
                style={{ fontFamily: "var(--font-headline)" }}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined">{it.icon}</span> {it.label}
                </div>
                <span className="material-symbols-outlined text-sm">lock</span>
              </div>
            );
          }
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`px-4 py-3 flex items-center gap-3 rounded-full transition-all text-sm font-semibold ${
                active
                  ? "bg-orange-100/60 text-orange-900 translate-x-1"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
              style={{ fontFamily: "var(--font-headline)" }}
            >
              <span className="material-symbols-outlined">{it.icon}</span> {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto px-4 space-y-4">
        <Link
          href="/profile"
          className="block w-full text-center py-3 rounded-full font-bold text-sm shadow-md kinetic-gradient"
          style={{ color: "#fff0e6", fontFamily: "var(--font-headline)" }}
        >
          Profile & Settings
        </Link>
        <div className="pt-4 border-t border-slate-100 space-y-1">
          <Link
            href="/profile"
            className="text-slate-500 px-4 py-2 flex items-center gap-3 hover:text-[#8b4b00] transition-colors text-sm font-semibold"
          >
            <span className="material-symbols-outlined text-lg">settings</span> Settings
          </Link>
          <form action="/auth/logout" method="post">
            <button
              type="submit"
              className="text-slate-500 px-4 py-2 flex items-center gap-3 hover:text-[#8b4b00] transition-colors text-sm font-semibold w-full"
            >
              <span className="material-symbols-outlined text-lg">logout</span> Sign out
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
