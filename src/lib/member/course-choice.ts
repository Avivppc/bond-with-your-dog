import type { CourseCardData } from "./courses";

/** What the onboarding "Your course" step shows for one chapter. Plain data for the client. */
export interface CourseChoice {
  id: string;
  title: string;
  description: string;
  image: string | null;
  chapterNumber: number | null;
  owned: boolean;
  /** "Opens after Foundations" style note, when the chapter needs an earlier one finished. */
  lockedByTitle: string | null;
  offer: { slug: string; price: string; free: boolean } | null;
  firstLesson: { title: string; href: string; number: number; image: string | null } | null;
}

const NO_CHAPTER = Number.MAX_SAFE_INTEGER;

function byChapter<T extends { chapterNumber: number | null }>(a: T, b: T): number {
  return (a.chapterNumber ?? NO_CHAPTER) - (b.chapterNumber ?? NO_CHAPTER);
}

/**
 * The course to preselect: the member's own pick while it is still offered, else the first
 * course they already own, else the first chapter (Foundations).
 */
export function defaultChoiceId(
  choices: readonly { id: string; chapterNumber: number | null; owned: boolean }[],
  chosenId: string | null
): string | null {
  if (chosenId && choices.some((c) => c.id === chosenId)) return chosenId;
  const ordered = [...choices].sort(byChapter);
  return (ordered.find((c) => c.owned) ?? ordered[0])?.id ?? null;
}

/**
 * What onboarding offers: the numbered chapters (Foundations, Moves, Let's Dance) plus anything
 * the member already owns. Before any chapter is published, every published course.
 */
export function chapterChoices<T extends { chapterNumber: number | null; owned: boolean }>(choices: readonly T[]): T[] {
  const ordered = [...choices].sort(byChapter);
  const chapters = ordered.filter((c) => c.chapterNumber !== null || c.owned);
  return chapters.some((c) => c.chapterNumber !== null) ? chapters : ordered;
}

/** Button label for a course the member doesn't own yet. */
export function unlockLabel(offer: { price: string; free: boolean }): string {
  return offer.free ? "Start for free" : `Get it · ${offer.price}`;
}

/** One sentence on how to get a course the member doesn't own yet. */
export function unlockSentence(offer: { price: string; free: boolean } | null): string {
  if (!offer) return "It opens soon.";
  return offer.free ? "It's free, so you can start right away." : `Unlock it (${offer.price}) whenever you're ready.`;
}

export function toCourseChoice(card: CourseCardData): CourseChoice {
  const course = card.course;
  const owned = card.status !== "not_owned";
  const lesson = course ? (course.progress.next ?? course.lessons[0] ?? null) : null;
  return {
    id: card.id,
    title: card.title,
    description: card.description,
    image: card.image,
    chapterNumber: card.chapterNumber,
    owned,
    lockedByTitle: card.status === "locked" || !owned ? card.lockedByTitle : null,
    offer: card.offers[0] ? { slug: card.offers[0].slug, price: card.offers[0].price, free: card.offers[0].free } : null,
    // A chapter locked behind an unfinished one can't be started, so it gets no lesson link.
    firstLesson:
      owned && card.status !== "locked" && course && lesson
        ? {
            title: lesson.title,
            href: `/learn/${course.course.id}/${lesson.id}`,
            number: course.lessons.findIndex((l) => l.id === lesson.id) + 1,
            image: lesson.thumbnail_url || course.course.image,
          }
        : null,
  };
}
