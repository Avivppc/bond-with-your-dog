import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { loadStudentCourse, type StudentCourse } from "@/lib/student-course-server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export interface ChapterLock {
  locked: boolean;
  requiredId: string | null;
  requiredTitle: string | null;
}

/**
 * "Opens after Foundations": a chapter with requires_course_id stays locked for members until
 * every lesson of the required chapter is complete. Staff previews are never locked.
 */
export async function chapterLock(supabase: ServerSupabase, course: StudentCourse, userId: string): Promise<ChapterLock> {
  const requiredId = course.course.requiresCourseId;
  if (!requiredId || course.isStaffPreview) return { locked: false, requiredId, requiredTitle: null };
  const required = await loadStudentCourse(supabase, requiredId, userId);
  if (!required) return { locked: false, requiredId, requiredTitle: null };
  const done = required.progress.total > 0 && required.progress.completed >= required.progress.total;
  return { locked: !done, requiredId, requiredTitle: required.course.title };
}
