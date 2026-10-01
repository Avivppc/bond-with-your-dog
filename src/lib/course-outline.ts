/**
 * Course outline (module → submodule → lesson) as a tree. Pure and immutable so the
 * admin editor, the member pages and the future mobile app can share it.
 */
export interface OutlineModuleRow {
  id: string;
  parent_id: string | null;
  title: string;
  position: number;
  published: boolean;
  /** Shown under the module heading in the member app (optional so older selects still type-check). */
  description?: string | null;
}

export interface OutlineLessonRow {
  id: string;
  module_id: string | null;
  title: string;
  position: number;
  published: boolean;
  kind: "video" | "quiz";
  free_preview: boolean;
  available_after_days: number | null;
}

export interface OutlineModule<L extends OutlineLessonRow = OutlineLessonRow> extends OutlineModuleRow {
  submodules: OutlineModule<L>[];
  lessons: L[];
}

export interface CourseOutline<L extends OutlineLessonRow = OutlineLessonRow> {
  modules: OutlineModule<L>[];
  /** Lessons with no module (or a module that no longer exists) — surfaced, never dropped. */
  unassigned: L[];
}

const byPosition = <T extends { position: number }>(a: T, b: T): number => a.position - b.position;

export function buildOutline<L extends OutlineLessonRow>(
  modules: readonly OutlineModuleRow[],
  lessons: readonly L[]
): CourseOutline<L> {
  const moduleIds = new Set(modules.map((m) => m.id));
  const lessonsOf = (moduleId: string): L[] => lessons.filter((l) => l.module_id === moduleId).sort(byPosition);

  const toNode = (m: OutlineModuleRow): OutlineModule<L> => ({
    ...m,
    submodules: modules.filter((s) => s.parent_id === m.id).sort(byPosition).map(toNode),
    lessons: lessonsOf(m.id),
  });

  return {
    modules: modules.filter((m) => m.parent_id === null).sort(byPosition).map(toNode),
    unassigned: lessons.filter((l) => l.module_id === null || !moduleIds.has(l.module_id)),
  };
}

/** Lessons in reading order (drives "next lesson" and numbering): own lessons, then submodules. */
export function flattenLessons<L extends OutlineLessonRow>(outline: CourseOutline<L>): L[] {
  const walk = (m: OutlineModule<L>): L[] => [...m.lessons, ...m.submodules.flatMap(walk)];
  return [...outline.modules.flatMap(walk), ...outline.unassigned];
}

/** Returns a new array with the item at `from` moved to `to`; invalid moves return a copy. */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const inRange = (i: number) => i >= 0 && i < items.length;
  if (!inRange(from) || !inRange(to) || from === to) return [...items];
  const without = [...items.slice(0, from), ...items.slice(from + 1)];
  return [...without.slice(0, to), items[from], ...without.slice(to)];
}
