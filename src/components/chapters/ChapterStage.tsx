import TestimonialCard from "@/components/TestimonialCard";
import { testimonialById } from "@/lib/testimonials";
import type { PerfectFor, Stage } from "./stages";

function PerfectForList({ items, color }: { items: readonly PerfectFor[]; color: string }) {
  return (
    <ul className="space-y-3 font-body text-on-surface-variant">
      {items.map(({ icon, label }) => (
        <li key={label} className="flex items-start gap-2">
          <span className={`material-symbols-outlined ${color} text-xl`}>{icon}</span>
          {label}
        </li>
      ))}
    </ul>
  );
}

interface ChapterStageProps {
  stage: Stage;
  /** The call to action under the testimonial (the site links to the chapter; members get their own). */
  cta: React.ReactNode;
  /** A small status line next to the badge, e.g. "Opens after Foundations". */
  status?: React.ReactNode;
  /** Tighter spacing inside the member app. */
  compact?: boolean;
}

/** One chapter as the website shows it: badge, pitch, what you'll learn, who it's for, outcome, quote, photo. */
export function ChapterStage({ stage, cta, status, compact = false }: ChapterStageProps) {
  const { badge, badgeBg, badgeIcon, title, body, learn, learnColor, perfectFor, perfectColor, outcome, outcomeColor, outcomeBg, testimonialId, img, imgAlt, imgAspect, sectionBg, reverse } = stage;
  const testimonial = testimonialById(testimonialId);
  return (
    <section className={compact ? "py-4" : "max-w-7xl mx-auto px-6 py-24"}>
      <div
        className={`${sectionBg} ${compact ? "rounded-[2rem] p-6 lg:p-12 gap-10" : "rounded-[3rem] p-8 lg:p-16 gap-16"} flex flex-col ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"} items-center relative overflow-hidden`}
      >
        {!reverse && <div className="absolute top-0 right-0 w-96 h-96 bg-secondary-container/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />}
        {badge.startsWith("Chapter Three") && (
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-tertiary-container/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        )}
        <div className="lg:w-1/2 relative z-10">
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${badgeBg} font-label text-sm font-bold`}>
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: '"FILL" 1' }}>
                {badgeIcon}
              </span>
              {badge}
            </div>
            {status}
          </div>
          <h2 className={`font-display ${compact ? "text-3xl lg:text-4xl" : "text-4xl lg:text-5xl"} font-bold text-on-background mb-6`}>{title}</h2>
          <p className="font-body text-lg text-on-surface-variant mb-8">{body}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div>
              <h4 className="font-display text-lg font-bold text-on-surface mb-4">You&apos;ll Learn:</h4>
              <ul className="space-y-3 font-body text-on-surface-variant">
                {learn.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className={`material-symbols-outlined ${learnColor} text-xl`}>check_circle</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              {/* Desktop: always visible. Mobile: collapsed behind a toggle. */}
              <h4 className="hidden md:block font-display text-lg font-bold text-on-surface mb-4">Perfect For:</h4>
              <details className="group md:hidden">
                <summary className="list-none cursor-pointer font-display text-lg font-bold text-on-surface mb-4 flex items-center justify-between">
                  Perfect For:
                  <span className="material-symbols-outlined text-xl group-open:rotate-180 transition-transform">expand_more</span>
                </summary>
                <PerfectForList items={perfectFor} color={perfectColor} />
              </details>
              <div className="hidden md:block">
                <PerfectForList items={perfectFor} color={perfectColor} />
              </div>
            </div>
          </div>
          <div className={`${outcomeBg} p-6 rounded-2xl shadow-sm mb-8`}>
            <p className="font-display font-semibold text-on-surface">
              <span className={`${outcomeColor} mr-2`}>Outcome:</span>
              {outcome}
            </p>
          </div>
          {testimonial && (
            <div className="mb-8">
              <TestimonialCard testimonial={testimonial} variant="inline" />
            </div>
          )}
          {cta}
        </div>
        <div className="lg:w-1/2 w-full order-first lg:order-none lg:self-center">
          <div className={`relative w-full ${imgAspect} max-h-[640px]`}>
            {reverse && <div className="absolute -inset-4 bg-primary-container/20 rounded-2xl rotate-3 transform scale-105" />}
            {/* eslint-disable-next-line @next/next/no-img-element -- static site photo, same as the public page */}
            <img className="absolute inset-0 w-full h-full object-cover object-top rounded-2xl shadow-xl z-10" alt={imgAlt} src={img} />
          </div>
        </div>
      </div>
    </section>
  );
}
