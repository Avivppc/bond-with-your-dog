"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navLinks = [
  { href: "/courses", label: "Courses" },
  { href: "/#membership", label: "Membership" },
  { href: "/#about", label: "About Roni" },
  { href: "/#blog", label: "Blog" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav
      className="fixed top-0 w-full z-50 shadow-sm"
      style={{
        backgroundColor: "rgba(237,248,255,0.75)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 1px 3px rgba(139,75,0,0.06)",
      }}
    >
      <div className="flex justify-between items-center px-6 md:px-8 py-4 max-w-7xl mx-auto">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl md:text-2xl font-black tracking-tight"
          style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#7c3900" }}
        >
          bond with your dog
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(({ href, label }) => {
            const active =
              href === "/courses"
                ? pathname === "/courses"
                : pathname === "/" && href.startsWith("/#");
            return (
              <Link
                key={href}
                href={href}
                className={`font-bold transition-colors ${
                  active
                    ? "text-orange-700 border-b-2 border-orange-500 pb-1"
                    : "text-stone-600 hover:text-orange-600"
                }`}
                style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif" }}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <button
            className="kinetic-gradient px-5 py-2.5 rounded-full font-bold text-sm tracking-wide transition-all active:scale-95 duration-200 shadow-lg"
            style={{
              fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif",
              color: "#fff0e6",
              boxShadow: "0 8px 24px rgba(139,75,0,0.25)",
            }}
          >
            Join Now
          </button>

          {/* Hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-surface-container transition-colors"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined">{menuOpen ? "close" : "menu"}</span>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden px-6 pb-6 pt-2 flex flex-col gap-4"
          style={{ backgroundColor: "rgba(237,248,255,0.97)", backdropFilter: "blur(20px)" }}
        >
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-stone-700 font-bold text-lg py-2 border-b border-surface-container-high"
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
