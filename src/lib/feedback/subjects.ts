/** "Which move is this?" options for Send a video: published moves, then open lessons. Pure. */

export interface MoveOption {
  id: string;
  slug: string;
  name: string;
  lesson_id: string | null;
  course_title: string | null;
  lesson_position: number | null;
}

export interface LessonOption {
  id: string;
  title: string;
  course_title: string;
}

export interface SubjectOption {
  value: string;
  label: string;
  group: "Moves" | "Lessons" | "Other";
  moveId: string | null;
  lessonId: string | null;
}

export const OTHER_SUBJECT = "other";

export function moveLabel(m: MoveOption): string {
  if (m.course_title && m.lesson_position) return `${m.name} · ${m.course_title}, Lesson ${m.lesson_position}`;
  if (m.course_title) return `${m.name} · ${m.course_title}`;
  return m.name;
}

export function buildSubjectOptions(moves: readonly MoveOption[], lessons: readonly LessonOption[]): SubjectOption[] {
  return [
    ...moves.map((m) => ({ value: `move:${m.id}`, label: moveLabel(m), group: "Moves" as const, moveId: m.id, lessonId: m.lesson_id })),
    ...lessons.map((l) => ({ value: `lesson:${l.id}`, label: `${l.title} · ${l.course_title}`, group: "Lessons" as const, moveId: null, lessonId: l.id })),
    { value: OTHER_SUBJECT, label: "Something else", group: "Other" as const, moveId: null, lessonId: null },
  ];
}

/** ?move=<slug> or ?lesson=<id> preselects; a lesson taught by a move prefers the move. */
export function defaultSubject(
  options: readonly SubjectOption[],
  moves: readonly MoveOption[],
  query: { move?: string | null; lesson?: string | null }
): string {
  const bySlug = query.move ? moves.find((m) => m.slug === query.move) : undefined;
  if (bySlug) return `move:${bySlug.id}`;
  if (query.lesson) {
    const viaMove = options.find((o) => o.moveId && o.lessonId === query.lesson);
    if (viaMove) return viaMove.value;
    const lesson = options.find((o) => o.value === `lesson:${query.lesson}`);
    if (lesson) return lesson.value;
  }
  return options[0]?.value ?? OTHER_SUBJECT;
}
