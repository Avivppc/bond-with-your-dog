import TestimonialCard from "@/components/TestimonialCard";
import { LEGAL_NAME } from "@/lib/legal";
import { sanitizeSiteHtml } from "@/lib/site/sanitize-site";
import { loadSiteSettings } from "@/lib/site-settings-server";
import { TESTIMONIALS } from "@/lib/testimonials";
import { BACKGROUND_CLASS, Highlight, img, items, SiteImg, str } from "../bits";
import type { SectionProps } from "./types";

// ---------- Rich text bodies ----------

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch] ?? ch);

/** Fills {{contact_email}} and {{legal_name}} (escaped), then sanitizes the stored HTML again. */
async function renderBodyHtml(body: string): Promise<string> {
  const { contactEmail } = await loadSiteSettings();
  const filled = body.replaceAll("{{contact_email}}", escapeHtml(contactEmail)).replaceAll("{{legal_name}}", escapeHtml(LEGAL_NAME));
  return sanitizeSiteHtml(filled);
}

async function RichBody({ body, className }: { body: string; className: string }) {
  const html = await renderBodyHtml(body);
  if (!html) return null;
  return <div className={`lesson-prose ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

// ---------- Stories page ----------

export function PhotoHero({ settings: s }: SectionProps) {
  const image = img(s.image);
  const text = str(s.text);
  return (
    <section className="relative overflow-hidden">
      {image.src ? (
        <SiteImg image={image} className="w-full h-[55vh] min-h-[360px] object-cover object-center" />
      ) : (
        <div className="w-full h-[55vh] min-h-[360px] bg-surface-container-low" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 px-6 pb-10 text-center">
        <h1 className="font-display font-extrabold text-4xl md:text-6xl tracking-tight leading-[1.05] mb-4">
          <Highlight text={str(s.heading)} />
        </h1>
        {text && <p className="font-body text-lg md:text-xl text-on-surface-variant max-w-xl mx-auto">{text}</p>}
      </div>
    </section>
  );
}

const PILL = "bg-surface-container-low font-label text-sm font-semibold px-4 py-2 rounded-full";

export function PillList({ settings: s }: SectionProps) {
  const eyebrow = str(s.eyebrow);
  const trailing = str(s.trailing);
  const pills = items(s.pills).map((p) => str(p.label)).filter((label) => label !== "");
  return (
    <section className="max-w-5xl mx-auto px-6 pt-16 pb-4 text-center">
      {eyebrow && <p className="font-label text-xs uppercase tracking-[0.2em] text-outline font-bold mb-4">{eyebrow}</p>}
      <ul className="flex flex-wrap justify-center gap-2">
        {pills.map((label, i) => (
          <li key={i} className={`${PILL} text-on-surface`}>
            {label}
          </li>
        ))}
        {trailing && <li className={`${PILL} text-on-surface-variant`}>{trailing}</li>}
      </ul>
    </section>
  );
}

export function QuoteGrid({ settings: s }: SectionProps) {
  const heading = str(s.heading);
  const text = str(s.text);
  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      {(heading || text) && (
        <div className="text-center mb-12">
          {heading && <h2 className="font-headline text-4xl md:text-5xl font-extrabold mb-4">{heading}</h2>}
          {text && <p className="text-on-surface-variant text-lg font-light">{text}</p>}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {TESTIMONIALS.map((testimonial) => (
          <TestimonialCard key={testimonial.id} testimonial={testimonial} />
        ))}
      </div>
    </section>
  );
}

// ---------- Text pages ----------

/**
 * The legal page look. The page's <main> already has pt-24; pt-4 makes the hand-built pt-28, and
 * the minimum height (100vh less that pt-24) matches its min-h-screen.
 */
export async function LegalText({ settings: s }: SectionProps) {
  const updated = str(s.updated);
  return (
    <section className="bg-background min-h-[calc(100vh-6rem)]">
      <div className="pt-4 pb-20 max-w-3xl mx-auto px-5">
        <h1 className="font-headline text-4xl font-extrabold tracking-tighter mb-2 text-on-surface">{str(s.heading)}</h1>
        {updated && <p className="text-sm mb-8 text-on-surface-variant">Last updated: {updated}</p>}
        <RichBody body={str(s.body)} className="bg-surface-container-lowest rounded-2xl p-6 md:p-8 text-on-surface" />
      </div>
    </section>
  );
}

const WIDTH_CLASS: Record<string, string> = { narrow: "max-w-3xl", wide: "max-w-5xl" };

export async function RichText({ settings: s }: SectionProps) {
  const heading = str(s.heading);
  return (
    <section className={`${BACKGROUND_CLASS[str(s.background)] ?? BACKGROUND_CLASS.surface} py-16`}>
      <div className={`${WIDTH_CLASS[str(s.width)] ?? WIDTH_CLASS.narrow} mx-auto px-6`}>
        {heading && <h2 className="font-headline text-3xl md:text-4xl font-extrabold mb-6">{heading}</h2>}
        <RichBody body={str(s.body)} className="text-lg" />
      </div>
    </section>
  );
}
