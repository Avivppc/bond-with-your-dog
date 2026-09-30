export interface ChapterLink {
  id: string;
  requires_course_id: string | null;
}

/**
 * Validates a course's "Opens after" choice: it must be another existing course and must not make
 * the chapters wait on each other (A after B after A). Returns an error message or null.
 */
export function opensAfterError(courseId: string, requiresId: string | null, courses: readonly ChapterLink[]): string | null {
  if (!requiresId) return null;
  if (requiresId === courseId) return "A course can't open after itself.";
  const byId = new Map(courses.map((c) => [c.id, c.requires_course_id]));
  if (!byId.has(requiresId)) return "Choose an existing course for “Opens after”.";
  const seen = new Set<string>([courseId]);
  let current: string | null = requiresId;
  while (current) {
    if (seen.has(current)) return "Those chapters would wait on each other. Pick an earlier chapter.";
    seen.add(current);
    current = byId.get(current) ?? null;
  }
  return null;
}
