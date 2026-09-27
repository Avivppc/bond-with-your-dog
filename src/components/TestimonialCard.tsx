import type { Testimonial } from "@/lib/testimonials";

interface TestimonialCardProps {
  testimonial: Testimonial;
  /**
   * "card": full card with an optional large photo on top.
   * "inline": quote only, for use inside another block.
   */
  variant?: "card" | "inline";
}

/**
 * Photo layout: when `photoUrl` is set, the student photo sits on top of
 * the card at 4:3 so both handler and dog stay visible. Drop a file in
 * /public/images/students and set `photoUrl` in src/lib/testimonials.ts.
 */
export default function TestimonialCard({ testimonial, variant = "card" }: TestimonialCardProps) {
  const { name, country, quote, detail, videoUrl, photoUrl } = testimonial;

  if (variant === "inline") {
    return (
      <figure className="border-l-4 border-primary/40 pl-5">
        <blockquote className="text-base md:text-lg font-light leading-relaxed mb-3 italic text-on-surface-variant">
          &ldquo;{quote}&rdquo;
        </blockquote>
        <figcaption>
          <Caption name={name} country={country} detail={detail} videoUrl={videoUrl} compact />
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className="bg-surface-container-lowest rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
      {photoUrl && (
        <div className="aspect-[4/3] w-full bg-surface-container-low">
          <img src={photoUrl} alt={`${name}`} className="w-full h-full object-cover object-top" />
        </div>
      )}
      <div className="p-8 md:p-10 flex flex-col justify-between flex-1">
        <blockquote className="text-lg md:text-xl font-light leading-relaxed mb-6 italic">
          &ldquo;{quote}&rdquo;
        </blockquote>
        <figcaption>
          <Caption name={name} country={country} detail={detail} videoUrl={videoUrl} />
        </figcaption>
      </div>
    </figure>
  );
}

interface CaptionProps {
  name: string;
  country?: string;
  detail?: string;
  videoUrl?: string;
  compact?: boolean;
}

function Caption({ name, country, detail, videoUrl, compact }: CaptionProps) {
  return (
    <>
      <p className={compact ? "font-bold text-sm text-on-surface" : "font-bold text-lg text-primary"}>
        {name}
        {country && <span className="font-normal text-on-surface-variant"> · {country}</span>}
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
    </>
  );
}
