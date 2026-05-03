"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { courses, type Course } from "@/lib/data";

type Level = Course["level"] | "All";
type Category = Course["category"] | "All Courses";
type SortKey = "Newest" | "Popular" | "Skill Level" | "Price: Low" | "Price: High";

const LEVEL_COLOR: Record<Course["level"], { color: string; icon: string }> = {
  Beginner: { color: "#6d5a00", icon: "signal_cellular_alt" },
  Intermediate: { color: "#c2410c", icon: "signal_cellular_alt_2_bar" },
  Advanced: { color: "#b91c1c", icon: "signal_cellular_alt" },
};

const CATEGORY_BADGE: Record<Course["category"], { bg: string; text: string }> = {
  Foundations: { bg: "#0e666a", text: "#c8fcff" },
  Choreography: { bg: "#8b4b00", text: "#fff0e6" },
  "Trick Training": { bg: "#6d5a00", text: "#fff2ce" },
};

export default function CoursesPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("All Courses");
  const [sort, setSort] = useState<SortKey>("Newest");

  const filtered = useMemo(() => {
    let list = [...courses];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.level.toLowerCase().includes(q)
      );
    }

    if (category !== "All Courses") {
      list = list.filter((c) => c.category === category);
    }

    if (sort === "Price: Low") list.sort((a, b) => a.price - b.price);
    else if (sort === "Price: High") list.sort((a, b) => b.price - a.price);
    else if (sort === "Popular") list.sort((a, b) => b.price - a.price);
    else if (sort === "Skill Level") {
      const order = { Beginner: 0, Intermediate: 1, Advanced: 2 };
      list.sort((a, b) => order[a.level] - order[b.level]);
    }
    // "Newest" = original order

    return list;
  }, [search, category, sort]);

  const categories: Category[] = ["All Courses", "Foundations", "Choreography", "Trick Training"];

  return (
    <>
      <Navbar />

      <main
        className="pt-28 pb-20 max-w-7xl mx-auto px-5 md:px-8"
        style={{ backgroundColor: "#edf8ff", minHeight: "100vh" }}
      >
        {/* ─── Header ─── */}
        <header className="mb-12 relative">
          <div className="max-w-3xl">
            <h1
              className="text-5xl md:text-7xl font-extrabold tracking-tighter mb-4 leading-tight"
              style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#243036" }}
            >
              Your Stage,{" "}
              <br />
              <span style={{ color: "#8b4b00", fontStyle: "italic" }}>Their Spotlight.</span>
            </h1>
            <p className="text-lg font-medium max-w-xl" style={{ color: "#515d64" }}>
              Master the art of canine choreography with professional coaching.
              From first steps to championship routines.
            </p>
          </div>
          <div className="hidden lg:block absolute -top-10 right-0 w-1/3 h-64 opacity-10 pointer-events-none select-none">
            <span className="material-symbols-outlined fill-icon" style={{ fontSize: "200px", color: "#8b4b00" }}>pets</span>
          </div>
        </header>

        {/* ─── Search & Filters ─── */}
        <section className="mb-10">
          <div
            className="rounded-xl p-4 flex flex-col md:flex-row gap-4 items-stretch md:items-center shadow-sm"
            style={{ backgroundColor: "#e4f3fc" }}
          >
            {/* Search */}
            <div className="relative w-full md:w-1/2">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-sm" style={{ color: "#6c7980" }}>search</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search courses or techniques..."
                className="w-full pl-12 pr-4 py-3 rounded-lg text-sm font-medium border-none focus:ring-2 focus:outline-none placeholder:text-[#a2afb6]"
                style={{ backgroundColor: "#ffffff" }}
              />
            </div>

            {/* Filters button + divider */}
            <div className="flex flex-wrap items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-high rounded-full text-sm font-semibold text-on-surface hover:bg-surface-bright transition-colors">
                <span className="material-symbols-outlined text-[20px]">tune</span>
                Filters
              </button>
              <div className="h-6 w-px bg-outline-variant/30 hidden md:block"></div>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className="px-4 py-2 rounded-full text-sm font-bold transition-colors"
                  style={
                    category === cat
                      ? { backgroundColor: "#a6eff3", color: "#005b5f" }
                      : { backgroundColor: "transparent", color: "#515d64" }
                  }
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort */}

            <div className="flex items-center gap-2 md:ml-auto shrink-0">
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#a2afb6" }}>Sort:</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="bg-transparent border-none text-sm font-bold focus:ring-0 cursor-pointer"
                style={{ color: "#8b4b00" }}
              >
                <option>Newest</option>
                <option>Popular</option>
                <option>Skill Level</option>
                <option>Price: Low</option>
                <option>Price: High</option>
              </select>
            </div>
          </div>
        </section>

        {/* ─── Results count ─── */}
        {search && (
          <p className="mb-6 text-sm" style={{ color: "#6c7980" }}>
            {filtered.length} result{filtered.length !== 1 ? "s" : ""} for &ldquo;{search}&rdquo;
          </p>
        )}

        {/* ─── Course Grid ─── */}
        {filtered.length === 0 ? (
          <div className="text-center py-24">
            <span className="material-symbols-outlined text-6xl mb-4 block" style={{ color: "#a2afb6" }}>search_off</span>
            <p className="text-lg font-bold mb-2" style={{ color: "#515d64" }}>No courses found</p>
            <button onClick={() => { setSearch(""); setCategory("All Courses"); }} className="text-sm font-bold" style={{ color: "#8b4b00" }}>
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 lg:gap-10">
            {filtered.map((course, i) => {
              const levelInfo = LEVEL_COLOR[course.level];
              const catBadge = CATEGORY_BADGE[course.category];
              const isOffset = i % 3 === 1;

              return (
                <article
                  key={course.id}
                  className={`group relative rounded-xl overflow-hidden flex flex-col transition-all duration-300 hover:scale-[1.02] cursor-pointer${isOffset ? " lg:translate-y-8" : ""}`}
                  style={{ backgroundColor: "#ffffff" }}
                >
                  {/* Image */}
                  <div className="relative h-56 overflow-hidden">
                    <Image
                      src={course.image}
                      alt={course.imageAlt}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      unoptimized
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span
                        className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest rounded-full"
                        style={{ backgroundColor: catBadge.bg, color: catBadge.text }}
                      >
                        {course.category}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-8 flex flex-col flex-grow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1 font-bold text-xs" style={{ color: levelInfo.color }}>
                        <span className="material-symbols-outlined fill-icon text-base">{levelInfo.icon}</span>
                        {course.level}
                      </div>
                      {course.badge && (
                        <span className="font-extrabold text-xs" style={{
                          fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif",
                          color: (course.badge === "Mastery Series" || course.badge === "Best Value") ? "#0e666a" : "#8b4b00",
                        }}>
                          {course.badge}
                        </span>
                      )}
                    </div>

                    <h3
                      className="text-xl font-bold mb-3 leading-tight group-hover:text-[#8b4b00] transition-colors"
                      style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#243036" }}
                    >
                      {course.title}
                    </h3>

                    <p className="text-sm mb-6 line-clamp-2" style={{ color: "#515d64" }}>
                      {course.description}
                    </p>

                    <div className="mt-auto pt-5 flex items-center justify-between" style={{ borderTop: "1px solid #dbebf4" }}>
                      <span
                        className="text-2xl font-black"
                        style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#243036" }}
                      >
                        ${course.price.toFixed(2)}
                      </span>
                      <button
                        className="kinetic-gradient px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-1.5 shadow-md active:scale-95 transition-transform group/btn"
                        style={{ color: "#fff0e6", boxShadow: "0 6px 20px rgba(139,75,0,0.22)" }}
                      >
                        Start Learning
                        <span className="material-symbols-outlined text-base transition-transform group-hover/btn:translate-x-1">play_circle</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ─── Membership Banner ─── */}
        <section
          className="mt-24 relative rounded-xl p-10 md:p-12 overflow-hidden shadow-xl"
          style={{ backgroundColor: "#a6eff3", boxShadow: "0 20px 60px rgba(14,102,106,0.12)" }}
        >
          <div className="relative z-10 max-w-2xl">
            <h2
              className="text-3xl md:text-4xl font-extrabold mb-4"
              style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", color: "#005b5f" }}
            >
              Unlimited Access for True Performers
            </h2>
            <p className="text-lg mb-8" style={{ color: "rgba(0,91,95,0.8)" }}>
              Get access to all current and future courses, live monthly coaching
              calls, and our private community with a Keta Tov Membership.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/#membership"
                className="px-7 py-4 rounded-full font-bold transition-colors"
                style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", backgroundColor: "#0e666a", color: "#c8fcff" }}
              >
                View Membership Plans
              </Link>
              <button
                className="px-7 py-4 rounded-full font-bold transition-colors"
                style={{ fontFamily: "var(--font-headline), Plus Jakarta Sans, sans-serif", border: "2px solid #0e666a", color: "#0e666a", backgroundColor: "transparent" }}
              >
                Learn More
              </button>
            </div>
          </div>
          <div className="absolute -right-16 -bottom-16 opacity-10 pointer-events-none select-none">
            <span className="material-symbols-outlined" style={{ fontSize: "360px" }}>music_note</span>
          </div>
        </section>
      </main>

      {/* FAB */}
      <button
        className="fixed bottom-6 right-6 w-14 h-14 kinetic-gradient rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group"
        style={{ color: "#fff0e6", boxShadow: "0 12px 36px rgba(139,75,0,0.35)" }}
        aria-label="My Learning"
      >
        <span className="material-symbols-outlined">school</span>
        <span
          className="absolute right-full mr-3 px-3 py-1 text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none"
          style={{ backgroundColor: "#243036", color: "#edf8ff" }}
        >
          My Learning
        </span>
      </button>

      <Footer />
    </>
  );
}
