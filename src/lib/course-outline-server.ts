import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { buildOutline, flattenLessons, type OutlineLessonRow } from "@/lib/course-outline";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/** Visible lessons of a course in outline reading order (RLS hides drafts from students). */
export async function loadLessonOrder(supabase: ServerSupabase, courseId: string): Promise<OutlineLessonRow[]> {
  const [modulesRes, lessonsRes] = await Promise.all([
    supabase.from("modules").select("id, parent_id, title, position, published").eq("course_id", courseId),
    supabase
      .from("lessons")
      .select("id, module_id, title, position, published, kind, free_preview, available_after_days")
      .eq("course_id", courseId),
  ]);
  if (modulesRes.error || lessonsRes.error) {
    console.error("lesson order load failed", { courseId, error: modulesRes.error?.message ?? lessonsRes.error?.message });
  }
  return flattenLessons(buildOutline(modulesRes.data ?? [], lessonsRes.data ?? []));
}
