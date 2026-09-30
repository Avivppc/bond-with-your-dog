/** Which lessons Practice mode offers and which one it opens by default. Pure. */
export interface CatalogCourse {
  id: string;
  title: string;
  chapterNumber: number | null;
  image: string | null;
}

export interface CatalogLesson {
  id: string;
  courseId: string;
  courseTitle: string;
  /** 1-based position in the course's reading order. */
  number: number;
  title: string;
  accessible: boolean;
  completed: boolean;
  stepCount: number;
  thumbnail: string | null;
}

export function sortCourses<C extends { title: string; chapterNumber: number | null }>(courses: readonly C[]): C[] {
  return [...courses].sort((a, b) => (a.chapterNumber ?? 1000) - (b.chapterNumber ?? 1000) || a.title.localeCompare(b.title));
}

/**
 * The requested lesson when the member can open it; otherwise the next unfinished lesson that
 * has practice steps, then any open lesson with steps. Null when no open lesson has steps.
 */
export function pickPracticeLesson(lessons: readonly CatalogLesson[], requestedId: string | null): CatalogLesson | null {
  if (requestedId) {
    const requested = lessons.find((l) => l.id === requestedId && l.accessible);
    if (requested) return requested;
  }
  const open = lessons.filter((l) => l.accessible && l.stepCount > 0);
  return open.find((l) => !l.completed) ?? open[0] ?? null;
}
