"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const LOGO_URL = "/images/logo.png";

const navLinks = [
  { href: "/courses", label: "Bonded Journey" },
  { href: "/stories", label: "Stories" },
  { href: "/about", label: "About Roni" },
  { href: "/quiz", label: "Find Your Journey" },
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

  // The primary CTA stays "Build Your Bond" for everyone; members get a quiet
  // text link to their learning area instead of a competing button.
  const memberLink = isAuthed
    ? { href: "/home", label: "My Learning", icon: "school" }
    : { href: "/login", label: "Log in", icon: "login" };

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
        <Link href="/" className="block">
          <img alt="BONDED Logo" className="h-10 w-auto" src={LOGO_URL} />
        </Link>

        <div
          className="hidden md:flex items-center space-x-8 text-sm tracking-tight font-headline"
        >
          {navLinks.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`transition-colors font-medium ${
                  active
                    ? "text-orange-800 font-bold border-b-2 border-orange-500 pb-1"
                    : "text-slate-600 hover:text-orange-700"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {isAuthed !== null && (
            <Link
              href={memberLink.href}
              className="hidden md:inline text-sm font-headline font-medium text-slate-600 hover:text-orange-700 transition-colors mr-3"
            >
              {memberLink.label}
            </Link>
          )}
          <Link
            href="/signup"
            className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-headline font-bold text-sm hover:scale-95 active:scale-90 transition-transform"
          >
            Build Your Bond
          </Link>
          <button
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-surface-container transition-colors"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined">
              {menuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          className="md:hidden px-6 pb-6 pt-2 flex flex-col gap-4"
          style={{
            backgroundColor: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(20px)",
          }}
        >
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-slate-700 font-headline font-bold text-lg py-2 border-b border-surface-container-high"
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          ))}
          <Link
            href={memberLink.href}
            className="text-slate-700 font-headline font-bold text-lg py-2 flex items-center gap-2"
            onClick={() => setMenuOpen(false)}
          >
            <span className="material-symbols-outlined text-xl">{memberLink.icon}</span>
            {memberLink.label}
          </Link>
        </div>
      )}
    </nav>
  );
}
