"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/courses", label: "Courses", icon: "play_circle" },
  { href: "/community", label: "Spotlight", icon: "movie_filter" },
  { href: "/profile", label: "Profile", icon: "person" },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-2 bg-white/85 backdrop-blur-xl lg:hidden rounded-t-[2rem] border-t border-white/60"
      style={{ boxShadow: "0 -4px 20px rgba(0,0,0,0.05)" }}
    >
      {items.map((it) => {
        const active = pathname === it.href || (it.href === "/courses" && pathname.startsWith("/learn"));
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex flex-col items-center justify-center px-3 py-2 text-[10px] font-medium transition-all ${
              active
                ? "kinetic-gradient text-white rounded-2xl -translate-y-2 shadow-lg p-3"
                : "text-slate-500"
            }`}
            style={active ? { color: "#fff0e6" } : undefined}
          >
            <span
              className="material-symbols-outlined"
              style={active ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              {it.icon}
            </span>
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
