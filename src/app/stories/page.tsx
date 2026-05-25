"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";

const stories = [
  {
    id: 1,
    tag: "Foundations graduate",
    name: "Sarah & Bella",
    quote: '"Clear, structured, and my dog loves them."',
    body: "Sarah came in burnt out on training apps. Bella's a labrador who'd 'done it all' and learned to phone it in. They restarted on Foundations and Bella started watching her again.",
    byline: "Sarah & Bella · Labrador · 4 years",
    category: "First-time handlers",
    offset: false,
  },
  {
    id: 2,
    tag: "First-time handler",
    name: "Marcus & Toby",
    quote: '"He looked up at me, not for the treat — for me."',
    body: "Toby is a five-year-old shepherd mix Marcus rescued in lockdown. Marcus had never trained a dog before. Their first eye-contact moment, on camera, made him cry.",
    byline: "Marcus & Toby · Shepherd mix · 5 years",
    category: "First-time handlers",
    offset: true,
  },
  {
    id: 3,
    tag: "Senior rescue",
    name: "Elena & Luna",
    quote: '"We\'re not winning competitions; we\'re winning evenings."',
    body: "A nine-year-old rescue mix who flinched at hand cues. Now offers a spin without being asked. Thirty days of Foundations, mostly five minutes at a time.",
    byline: "Elena & Luna · Rescue mix · 9 years",
    category: "Senior dogs",
    offset: false,
  },
  {
    id: 4,
    tag: "Reactive dog",
    name: "Nina & Otis",
    quote: '"He stopped lunging at bikes. Then he started spinning."',
    body: "Otis is a border collie cross who reacted to everything that moved. Nina used the engagement work as a redirect. She didn't expect the dancing — but she got it.",
    byline: "Nina & Otis · Border collie cross · 3 years",
    category: "Reactive dogs",
    offset: false,
  },
  {
    id: 5,
    tag: "Puppy",
    name: "Marta & Pip",
    quote: '"She picked up the cues faster than I could film them."',
    body: "Pip is a fourteen-week-old cocker spaniel. Marta started Foundations the day she got her home. The hand-target lesson took one session. The video has 80k views.",
    byline: "Marta & Pip · Cocker spaniel · 14 weeks",
    category: "Puppies",
    offset: true,
  },
  {
    id: 6,
    tag: "Big-dog handler",
    name: "James & Goose",
    quote: '"A 40-kilo dog who chooses to be quiet."',
    body: "Goose is a Great Dane with the focus span of a hummingbird. James thought 'dancing' was for small dogs. The Human Movement course taught him he'd been the bouncy one all along.",
    byline: "James & Goose · Great Dane · 2 years",
    category: "Rescue dogs",
    offset: false,
  },
];

const filters = ["All stories", "Rescue dogs", "First-time handlers", "Senior dogs", "Reactive dogs", "Puppies"];

function Placeholder({ label, className = "", style }: { label: string; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`flex items-center justify-center text-on-surface-variant ${className}`}
      style={{
        background: "repeating-linear-gradient(-45deg,#e4f3fc,#e4f3fc 12px,#d4e5ef 12px,#d4e5ef 24px)",
        ...style,
      }}
    >
      <span className="bg-white/90 px-3 py-1.5 rounded-full text-xs font-mono font-medium uppercase tracking-wide text-on-surface-variant">
        {label}
      </span>
    </div>
  );
}

export default function StoriesPage() {
  const [activeFilter, setActiveFilter] = useState("All stories");

  const filtered = activeFilter === "All stories"
    ? stories
    : stories.filter((s) => s.category === activeFilter);

  return (
    <>
      <Navbar />
      <main className="pt-24 overflow-hidden">

        {/* Hero */}
        <section className="relative px-8 py-12 md:py-24 max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <span className="inline-block mb-6 px-4 py-1.5 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold uppercase tracking-[0.18em]">
              Student stories
            </span>
            <h1 className="font-headline text-5xl md:text-7xl font-extrabold text-on-surface leading-[1.05] tracking-tight mb-6">
              Real handlers.<br />Real dogs.<br /><span className="text-primary italic">Real moments.</span>
            </h1>
            <p className="text-lg md:text-xl text-on-surface-variant max-w-xl leading-relaxed">
              A wall of evidence that the work works — most of it filmed on phones, in living rooms, with dogs who very much did not start out ready for a stage.
            </p>
          </div>
        </section>

        {/* Featured story */}
        <section className="bg-surface-container-low py-24 mb-24">
          <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-7 relative">
              <Placeholder label="Featured video · Elena & Luna" className="aspect-video rounded-xl shadow-2xl" style={{ transform: "rotate(-1deg)" }} />
              <div className="absolute -bottom-6 -right-6 bg-tertiary-container px-5 py-3 rounded-full shadow-lg">
                <p className="text-on-tertiary-container font-bold text-sm">Senior rescue · 9 years old</p>
              </div>
            </div>
            <div className="md:col-span-5">
              <span className="text-secondary font-bold uppercase tracking-widest text-sm mb-4 block">Featured story · 30 days</span>
              <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
                Elena thought Luna was too old. Luna disagreed.
              </h2>
              <p className="text-on-surface-variant text-lg leading-relaxed mb-6">
                &ldquo;I never thought my senior rescue could dance. We&apos;re not winning competitions; we&apos;re winning evenings.&rdquo;
              </p>
              <p className="text-on-surface-variant leading-relaxed mb-6">
                Luna came home at eight. Wary, food-driven, allergic to eye contact. Thirty days into the Foundations course Elena posted a clip of Luna offering a spin — unprompted, tail up, the whole thing. The comments under that clip is what made us put this page together.
              </p>
              <a href="#" className="inline-flex items-center gap-2 text-primary font-bold group/btn">
                Read the full story{" "}
                <span className="material-symbols-outlined text-lg group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
              </a>
            </div>
          </div>
        </section>

        {/* Filter chips */}
        <section className="max-w-7xl mx-auto px-8 mb-12">
          <div className="flex flex-wrap gap-3 items-center">
            <span className="text-xs font-bold uppercase tracking-widest text-outline mr-2">Filter</span>
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-2 rounded-full text-sm font-bold transition ${
                  activeFilter === f
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-high text-on-surface font-medium hover:bg-surface-container-highest"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        {/* Story grid */}
        <section className="max-w-7xl mx-auto px-8 mb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {filtered.map((story) => (
              <article
                key={story.id}
                className={`bg-surface-container-lowest rounded-lg overflow-hidden shadow-sm group hover:scale-[1.02] transition-all duration-500 ${story.offset ? "md:translate-y-8" : ""}`}
              >
                <Placeholder label={story.name} className="aspect-[4/3]" />
                <div className="p-6">
                  <span className="text-xs font-bold uppercase tracking-widest text-secondary">{story.tag}</span>
                  <h3 className="font-headline text-xl font-extrabold mt-2 mb-3">{story.quote}</h3>
                  <p className="text-on-surface-variant text-sm leading-relaxed">{story.body}</p>
                  <p className="text-xs text-outline font-bold mt-4">— {story.byline}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Quote wall */}
        <section className="bg-surface-container py-24 mb-32">
          <div className="max-w-7xl mx-auto px-8">
            <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-16 text-center">Lines from the community</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <blockquote className="bg-surface-container-lowest p-8 rounded-lg">
                <p className="text-base italic mb-4">&ldquo;I stopped caring whether the trick looked right. I started caring whether she enjoyed it. Everything got easier.&rdquo;</p>
                <p className="text-xs font-bold text-outline">— Hila</p>
              </blockquote>
              <blockquote className="bg-surface-container-lowest p-8 rounded-lg md:translate-y-4">
                <p className="text-base italic mb-4">&ldquo;Roni&apos;s office hours saved a relationship I thought I&apos;d ruined. He&apos;s a different dog. I&apos;m a different person.&rdquo;</p>
                <p className="text-xs font-bold text-outline">— Andrés</p>
              </blockquote>
              <blockquote className="bg-surface-container-lowest p-8 rounded-lg">
                <p className="text-base italic mb-4">&ldquo;Eight months in. We have not done a single &lsquo;routine.&rsquo; We are, however, having the best year.&rdquo;</p>
                <p className="text-xs font-bold text-outline">— Priya</p>
              </blockquote>
            </div>
          </div>
        </section>

        {/* Submit your story */}
        <section className="max-w-7xl mx-auto px-8 mb-20">
          <div className="bg-secondary-container rounded-xl p-8 md:p-16 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-secondary font-bold uppercase tracking-widest text-sm mb-4 block">Your turn</span>
              <h2 className="font-headline text-3xl md:text-5xl font-extrabold text-on-secondary-container mb-4">Share a moment.</h2>
              <p className="text-on-secondary-container/80 text-lg">
                A short clip, a paragraph, a photo. Anything that shows what shifted. We feature one new story every week.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <a
                href="#"
                className="bg-secondary text-on-secondary px-8 py-4 rounded-full font-headline font-bold text-lg text-center"
                style={{ textDecoration: "none" }}
              >
                Submit your story
              </a>
              <p className="text-xs text-on-secondary-container/70 text-center">Members &amp; non-members welcome. You keep your video.</p>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
