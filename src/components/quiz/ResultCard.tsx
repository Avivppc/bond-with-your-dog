import Link from "next/link";
import type { TierResultContent } from "@/lib/quiz/data";

interface ResultCardProps {
  result: TierResultContent;
}

export default function ResultCard({ result }: ResultCardProps) {
  return (
    <div className="text-center">
      <div className="image-reveal-wrapper kinetic-shadow mb-10 aspect-[16/9] w-full">
        <img
          src={result.imageUrl}
          alt={result.imageAlt}
          className="w-full h-full object-cover"
          loading="eager"
        />
      </div>

      <p className="font-label text-sm font-semibold text-secondary uppercase tracking-widest mb-4">
        Based on your answers…
      </p>
      <p className="font-body text-lg text-on-surface-variant max-w-2xl mx-auto mb-6">
        {result.personalization}
      </p>
      <h1 className="font-display font-extrabold text-4xl md:text-5xl tracking-tight leading-[1.05] mb-6">
        {result.headline}
      </h1>
      <p className="font-body text-lg text-on-surface-variant max-w-2xl mx-auto mb-10 leading-relaxed">
        {result.supporting}
      </p>

      <p className="font-label text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4">
        You&apos;ll learn
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
          href={result.cta.href}
          className="bg-gradient-to-r from-primary to-primary-container text-on-primary font-label text-base font-semibold px-8 py-4 rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          {result.cta.label}
        </Link>
        {result.secondaryCta && (
          <Link
            href={result.secondaryCta.href}
            className="bg-surface-container text-on-surface font-label text-base font-semibold px-8 py-4 rounded-full hover:bg-surface-container-high transition-colors"
          >
            {result.secondaryCta.label}
          </Link>
        )}
      </div>
    </div>
  );
}
