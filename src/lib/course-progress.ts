/** Student progress through a course's lessons (already in reading order). Pure — shared with the app. */
export interface CourseProgress<L> {
  completed: number;
  total: number;
  percent: number;
  /** First lesson not yet completed — where "Continue training" goes. */
  next: L | null;
}

export function courseProgress<L extends { id: string }>(lessons: readonly L[], completedIds: ReadonlySet<string>): CourseProgress<L> {
  const completed = lessons.filter((l) => completedIds.has(l.id)).length;
  const total = lessons.length;
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
    next: lessons.find((l) => !completedIds.has(l.id)) ?? null,
  };
}

export interface LessonNeighbors<L> {
  prev: L | null;
  next: L | null;
  /** 1-based position in the course, 0 when the lesson isn't listed. */
  number: number;
}

export function lessonNeighbors<L extends { id: string }>(lessons: readonly L[], lessonId: string): LessonNeighbors<L> {
  const index = lessons.findIndex((l) => l.id === lessonId);
  if (index === -1) return { prev: null, next: null, number: 0 };
  return {
    prev: index > 0 ? lessons[index - 1] : null,
    next: index < lessons.length - 1 ? lessons[index + 1] : null,
    number: index + 1,
  };
}
