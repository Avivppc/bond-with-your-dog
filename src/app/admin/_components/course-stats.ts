import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";

export interface CourseStats {
  activeStudents: number;
  lessons: number;
  modules: number;
}

export interface AdminCourseRow {
  id: string;
  title: string;
  image: string | null;
  published: boolean;
  created_at: string;
  stats: CourseStats;
}

const NO_STATS: CourseStats = { activeStudents: 0, lessons: 0, modules: 0 };

/**
 * Courses for the admin in chapter order (Foundations, Moves, Let's Dance), then the rest newest
 * first, with per-course counts from one DB function.
 */
export async function loadAdminCourses(limit?: number): Promise<AdminCourseRow[]> {
  const sb = createServiceClient();
  let query = sb
    .from("courses")
    .select("id, title, image, published, created_at")
    .order("chapter_number", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const [coursesRes, statsRes] = await Promise.all([query, sb.rpc("admin_course_stats")]);
  if (coursesRes.error) console.error("[admin] course list failed", coursesRes.error.message);
  if (statsRes.error) console.error("[admin] course stats failed", statsRes.error.message);

  const statsOf = new Map(
    ((statsRes.data ?? []) as { course_id: string; active_students: number; lessons: number; modules: number }[]).map((s) => [
      s.course_id,
      { activeStudents: Number(s.active_students), lessons: Number(s.lessons), modules: Number(s.modules) },
    ])
  );
  return (coursesRes.data ?? []).map((c) => ({ ...c, image: c.image || null, stats: statsOf.get(c.id) ?? NO_STATS }));
}
