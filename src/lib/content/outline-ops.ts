/** Pure helpers for course-outline editing (duplicate, bulk status). Immutable: inputs are never changed. */

export const MAX_TITLE_LENGTH = 200;
const COPY_SUFFIX = " (copy)";

/** "Sit" → "Sit (copy)", trimmed so the result still fits the title limit. */
export function copyTitle(title: string): string {
  const base = title.trim() || "Lesson";
  return `${base.slice(0, MAX_TITLE_LENGTH - COPY_SUFFIX.length)}${COPY_SUFFIX}`;
}

/** `ids` with `insertId` moved to sit right after `afterId` (appended when `afterId` is missing). */
export function orderAfter(ids: readonly string[], afterId: string, insertId: string): string[] {
  const rest = ids.filter((id) => id !== insertId);
  const at = rest.indexOf(afterId);
  if (at === -1) return [...rest, insertId];
  return [...rest.slice(0, at + 1), insertId, ...rest.slice(at + 1)];
}

export interface ModuleNode {
  id: string;
  parent_id: string | null;
}

/**
 * The module ids a bulk action covers: the given module and its submodules, or — with
 * `rootId` null — every module of the course. Unknown roots cover nothing.
 */
export function moduleScope(modules: readonly ModuleNode[], rootId: string | null): string[] {
  if (rootId === null) return modules.map((m) => m.id);
  if (!modules.some((m) => m.id === rootId)) return [];
  return [rootId, ...modules.filter((m) => m.parent_id === rootId).map((m) => m.id)];
}
