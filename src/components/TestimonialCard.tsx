import type { Testimonial } from "@/lib/testimonials";

interface TestimonialCardProps {
  testimonial: Testimonial;
  /** "card" = full card with background; "inline" = quote only, for use inside another block. */
  variant?: "card" | "inline";
}

export default function TestimonialCard({ testimonial, variant = "card" }: TestimonialCardProps) {
  const { name, country, quote, detail, videoUrl, photoUrl } = testimonial;
  const isCard = variant === "card";

  return (
    <figure
      className={
        isCard
          ? "bg-surface-container-lowest p-8 md:p-10 rounded-2xl shadow-sm flex flex-col justify-between h-full"
          : "border-l-4 border-primary/40 pl-5"
      }
    >
      <blockquote
        className={
          isCard
            ? "text-lg md:text-xl font-light leading-relaxed mb-6 italic"
            : "text-base md:text-lg font-light leading-relaxed mb-3 italic text-on-surface-variant"
        }
      >
        &ldquo;{quote}&rdquo;
      </blockquote>
      <figcaption className={photoUrl ? "flex items-start gap-4" : undefined}>
        {photoUrl && (
          <img
            src={photoUrl}
            alt={name}
            className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-surface-container-high"
          />
        )}
        <div>
        <p className={isCard ? "font-bold text-lg text-primary" : "font-bold text-sm text-on-surface"}>
          {name}
          {country && (
            <span className="font-normal text-on-surface-variant"> · {country}</span>
          )}
        </p>
        {detail && <p className="text-sm text-outline mt-1">{detail}</p>}
        {videoUrl && (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-bold text-secondary mt-3 hover:underline"
          >
            <span className="material-symbols-outlined text-lg">play_circle</span>
            Watch their video
          </a>
        )}
        </div>
      </figcaption>
    </figure>
  );
}
