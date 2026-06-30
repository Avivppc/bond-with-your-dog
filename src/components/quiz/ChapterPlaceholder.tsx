import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { Tier } from "@/lib/quiz/data";
import { TIER_RESULTS } from "@/lib/quiz/data";

interface ChapterPlaceholderProps {
  tier: Tier;
}

export default function ChapterPlaceholder({ tier }: ChapterPlaceholderProps) {
  const result = TIER_RESULTS[tier];

  return (
    <>
      <Navbar />
      <main className="pt-32 pb-24 px-6 md:px-8 min-h-screen">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-tertiary-container text-on-tertiary-container px-4 py-2 rounded-full font-label font-semibold text-sm mb-8 uppercase tracking-widest">
            Coming Soon
          </div>
          <h1 className="font-display font-extrabold text-4xl md:text-6xl tracking-tight leading-[1.05] mb-6">
            {result.headline}
          </h1>
          <p className="font-body text-lg text-on-surface-variant max-w-xl mx-auto mb-10 leading-relaxed">
            {result.supporting} This chapter page is being designed — for now,
            explore the full BONDED Method or get in touch to enroll.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {result.learn.map((item) => (
              <span
                key={item}
                className="bg-surface-container-low text-on-surface font-label text-sm font-semibold px-5 py-2.5 rounded-full"
              >
                {item}
              </span>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/enroll"
              className="bg-gradient-to-r from-primary to-primary-container text-on-primary font-label text-base font-semibold px-8 py-4 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
            >
              Enroll Now
            </Link>
            <Link
              href="/courses"
              className="bg-surface-container text-on-surface font-label text-base font-semibold px-8 py-4 rounded-full hover:bg-surface-container-high transition-colors"
            >
              Explore the Method
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
