import type { CourseOutline, OutlineLessonRow } from "./course-outline";

/**
 * Lessons a "limited access" member can't open: everything in top-level modules after the paywall
 * module (with their submodules), plus lessons without a module. Mirrors
 * private.lesson_behind_paywall in the database, which is what actually enforces it.
 */
export function lessonsBehindPaywall<L extends OutlineLessonRow>(outline: CourseOutline<L>, paywallAfterModuleId: string | null): Set<string> {
  if (!paywallAfterModuleId) return new Set();
  const index = outline.modules.findIndex((m) => m.id === paywallAfterModuleId);
  if (index === -1) return new Set();
  const behind = outline.modules.slice(index + 1).flatMap((m) => [...m.lessons, ...m.submodules.flatMap((s) => s.lessons)]);
  return new Set([...behind, ...outline.unassigned].map((l) => l.id));
}

export interface PaywallPlacement {
  moduleIds: string[];
  /** Module the paywall follows, or null when the list has no paywall marker. */
  paywallAfter: string | null;
}

/**
 * The admin outline drags a paywall marker among the top-level modules. Splits the dropped order
 * into the module order and the paywall position; null when the marker ended above every module.
 */
export function placePaywall(ids: readonly string[], markerId: string): PaywallPlacement | null {
  const at = ids.indexOf(markerId);
  const moduleIds = ids.filter((id) => id !== markerId);
  if (at === -1) return { moduleIds, paywallAfter: null };
  if (at === 0) return null;
  return { moduleIds, paywallAfter: ids[at - 1] };
}
