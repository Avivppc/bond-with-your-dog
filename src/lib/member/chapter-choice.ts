/**
 * What a chapter card offers a member on My Courses (pure, tested): continue it, buy it, look
 * inside, or wait for it to open.
 */

export interface ChapterChoiceInput {
  courseId: string;
  ctaLabel: string;
  published: boolean;
  owned: boolean;
  /** The chapter's published offer that gives full access, if any. */
  offer: { slug: string; price: string } | null;
  /** The chapter that comes before this one ("Moves" comes after "Foundations"). */
  requiresTitle: string | null;
}

export interface ChapterChoice {
  kind: "owned" | "buy" | "preview" | "soon";
  /** null when there is nothing to click yet. */
  href: string | null;
  label: string;
  note?: string;
}

export function chapterChoice(input: ChapterChoiceInput): ChapterChoice {
  const note = input.requiresTitle ? { note: `Best after ${input.requiresTitle}` } : {};
  if (input.owned) return { kind: "owned", href: `/learn/${input.courseId}`, label: "Continue", ...note };
  if (!input.published) return { kind: "soon", href: null, label: "Opening soon", ...note };
  if (input.offer) return { kind: "buy", href: `/checkout/${input.offer.slug}`, label: `${input.ctaLabel} · ${input.offer.price}`, ...note };
  return { kind: "preview", href: `/learn/${input.courseId}`, label: "Preview the chapter", ...note };
}
