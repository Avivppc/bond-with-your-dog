"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { href: "/courses", label: "Courses" },
  { href: "/#membership", label: "Membership" },
  { href: "/community", label: "Community" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthed, setIsAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setIsAuthed(Boolean(data.user)));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(Boolean(session?.user));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <nav
      className="fixed top-0 w-full z-50 shadow-sm"
      style={{
        backgroundColor: "rgba(255,255,255,0.70)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex justify-between items-center px-6 md:px-8 h-20 max-w-7xl mx-auto">
        <Link
          href="/"
          className="text-2xl font-black tracking-tighter"
          style={{ color: "#7c3900", fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif" }}
        >
          Keta Tov
        </Link>

        <div className="hidden md:flex items-center space-x-8 text-sm tracking-tight" style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif" }}>
          {navLinks.map(({ href, label }) => {
            const active = href === "/courses" ? pathname === "/courses" : href === "/community" ? pathname === "/community" : false;
            return (
              <Link
                key={href}
                href={href}
                className={`transition-colors font-medium ${active ? "text-orange-800 font-bold border-b-2 border-orange-500 pb-1" : "text-slate-600 hover:text-orange-700"}`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {isAuthed ? (
            <Link
              href="/dashboard"
              className="kinetic-gradient px-6 py-2.5 rounded-full font-bold text-sm hover:scale-95 active:scale-90 transition-transform"
              style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#fff0e6" }}
            >
              My Learning
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden md:inline px-4 py-2.5 rounded-full font-bold text-sm text-slate-700 hover:text-orange-700 transition-colors"
                style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif" }}
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="kinetic-gradient px-6 py-2.5 rounded-full font-bold text-sm hover:scale-95 active:scale-90 transition-transform"
                style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#fff0e6" }}
              >
                Join the Dance
              </Link>
            </>
          )}
          <button
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-surface-container transition-colors"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined">{menuOpen ? "close" : "menu"}</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          className="md:hidden px-6 pb-6 pt-2 flex flex-col gap-4"
          style={{ backgroundColor: "rgba(255,255,255,0.97)", backdropFilter: "blur(20px)" }}
        >
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-slate-700 font-bold text-lg py-2 border-b border-surface-container-high"
              style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif" }}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
