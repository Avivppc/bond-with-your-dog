import Link from "next/link";
import type { ReactNode } from "react";
import PlanCtaLink from "@/components/analytics/PlanCtaLink";
import type { FieldValue, FieldValues, ImageValue, LinkValue } from "@/lib/site/fields";
import type { Tier } from "@/lib/quiz/data";

/** Small building blocks the website sections share. */

// ---------- Reading values (sections get FieldValues; these give typed values back) ----------

export const str = (v: FieldValue | undefined): string => (typeof v === "string" ? v : "");
export const bool = (v: FieldValue | undefined): boolean => v === true;
export const img = (v: FieldValue | undefined): ImageValue =>
  v && typeof v === "object" && !Array.isArray(v) && "src" in v ? (v as ImageValue) : { src: "", alt: "" };
export const lnk = (v: FieldValue | undefined): LinkValue =>
  v && typeof v === "object" && !Array.isArray(v) && "href" in v ? (v as LinkValue) : { label: "", href: "" };
export const items = (v: FieldValue | undefined): FieldValues[] => (Array.isArray(v) ? v : []);

/** A link with both text and a target. */
export const hasLink = (l: LinkValue): boolean => l.label.trim() !== "" && l.href.trim() !== "";

// ---------- Text ----------

/** "It was never about *teaching dogs*" → the starred words get `accentClass`. */
export function Highlight({ text, accentClass = "text-primary" }: { text: string; accentClass?: string }) {
  const parts = text.split(/\*([^*]+)\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className={accentClass}>
            {part}
          </span>
        ) : (
          <LineBreaks key={i} text={part} />
        ),
      )}
    </>
  );
}

/** Single new lines in a heading become <br />. */
function LineBreaks({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {line}
        </span>
      ))}
    </>
  );
}

/** Blank lines separate paragraphs. */
export function Paragraphs({ text, className, firstClassName }: { text: string; className?: string; firstClassName?: string }) {
  const paras = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <>
      {paras.map((p, i) => (
        <p key={i} className={i === 0 && firstClassName ? firstClassName : className}>
          {p}
        </p>
      ))}
    </>
  );
}

// ---------- Links and images ----------

const CHAPTER_PLANS: Record<string, Tier> = {
  "/chapter/foundations": "foundations",
  "/chapter/moves": "moves",
  "/chapter/lets-dance": "letsDance",
};

/**
 * A button or text link from a link field. Chapter links are reported like the hand-built pages'
 * plan buttons; site paths use client navigation; other links are plain anchors.
 */
export function SiteLink({ link, className, children }: { link: LinkValue; className?: string; children?: ReactNode }) {
  const href = link.href.trim();
  const plan = CHAPTER_PLANS[href];
  if (plan) {
    return (
      <PlanCtaLink href={href} label={link.label} plan={plan} location="site_section" className={className}>
        {children}
      </PlanCtaLink>
    );
  }
  if (href.startsWith("/") || href.startsWith("#")) {
    return (
      <Link href={href} className={className}>
        {link.label}
        {children}
      </Link>
    );
  }
  const external = href.startsWith("http");
  return (
    <a href={href} className={className} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {link.label}
      {children}
    </a>
  );
}

/** A plain <img> (site photos are already sized; uploads come from our storage bucket). */
export function SiteImg({ image, className, style }: { image: ImageValue; className?: string; style?: React.CSSProperties }) {
  if (!image.src) return null;
  // eslint-disable-next-line @next/next/no-img-element -- matches the hand-built pages; uploads are external URLs
  return <img src={image.src} alt={image.alt} className={className} style={style} />;
}

export function Icon({ name, className = "", filled = false }: { name: string; className?: string; filled?: boolean }) {
  if (!name) return null;
  return (
    <span className={`material-symbols-outlined ${className}`} style={filled ? { fontVariationSettings: '"FILL" 1' } : undefined} aria-hidden>
      {name}
    </span>
  );
}

// ---------- Shared choices → classes ----------

export const BACKGROUND_CLASS: Record<string, string> = {
  surface: "bg-surface",
  low: "bg-surface-container-low",
  high: "bg-surface-container-high",
  highest: "bg-surface-container-highest",
  white: "bg-surface-container-lowest",
  primary: "bg-primary text-on-primary",
};

export const ACCENT_TEXT: Record<string, string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  tertiary: "text-tertiary",
};
