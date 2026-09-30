import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isEnrollmentActive } from "@/lib/enrollment";
import { loadStudentCourse, type StudentCourse } from "@/lib/student-course-server";
import { parsePracticeSteps } from "../session";
import { sortCourses, type CatalogCourse, type CatalogLesson } from "../catalog";

export interface CatalogCourseView extends CatalogCourse {
  completed: number;
  total: number;
  enrolledAt: string;
}

export interface PracticeCatalog {
  /** Courses with an active enrollment, in chapter order. */
  courses: CatalogCourseView[];
  /** Their visible lessons in reading order, with access and practice-step info. */
  lessons: CatalogLesson[];
}

function toLessons(data: StudentCourse, extras: ReadonlyMap<string, { steps: number; thumbnail: string | null }>): CatalogLesson[] {
  return data.lessons.map((l, i) => {
    const state = data.states.get(l.id)?.kind;
    const extra = extras.get(l.id);
    return {
      id: l.id,
      courseId: data.course.id,
      courseTitle: data.course.title,
      number: i + 1,
      title: l.title,
      accessible: state === "open" || state === "completed",
      completed: state === "completed",
      stepCount: extra?.steps ?? 0,
      thumbnail: extra?.thumbnail ?? null,
    };
  });
}

/**
 * The member's enrolled courses and lessons (one load per request). Access mirrors
 * can_access_lesson; writes still go through the database's own checks.
 */
export const loadPracticeCatalog = cache(async (userId: string): Promise<PracticeCatalog> => {
  const supabase = await createClient();
  const { data: enrollments, error } = await supabase.from("enrollments").select("course_id, enrolled_at, expires_at").eq("user_id", userId);
  if (error) console.error("[practice] enrollments load failed", error.message);
  const active = (enrollments ?? []).filter((e) => isEnrollmentActive(e));
  if (active.length === 0) return { courses: [], lessons: [] };

  const ids = active.map((e) => e.course_id);
  const [loaded, chaptersRes] = await Promise.all([
    Promise.all(ids.map((id) => loadStudentCourse(supabase, id, userId))),
    supabase.from("courses").select("id, chapter_number").in("id", ids),
  ]);
  const courses = loaded.filter((c): c is StudentCourse => c !== null);
  const lessonIds = courses.flatMap((c) => c.lessons.map((l) => l.id));
  const extrasRes = lessonIds.length
    ? await supabase.from("lessons").select("id, practice_steps, thumbnail_url").in("id", lessonIds)
    : { data: [], error: null };
  if (extrasRes.error) console.error("[practice] lesson extras load failed", extrasRes.error.message);

  const extras = new Map((extrasRes.data ?? []).map((l) => [l.id as string, { steps: parsePracticeSteps(l.practice_steps).length, thumbnail: (l.thumbnail_url as string | null) || null }]));
  const chapters = new Map((chaptersRes.data ?? []).map((c) => [c.id as string, c.chapter_number as number | null]));
  const enrolledAt = new Map(active.map((e) => [e.course_id as string, e.enrolled_at as string]));

  const views: CatalogCourseView[] = sortCourses(
    courses.map((c) => ({
      id: c.course.id,
      title: c.course.title,
      chapterNumber: chapters.get(c.course.id) ?? null,
      image: c.course.image,
      completed: c.progress.completed,
      total: c.progress.total,
      enrolledAt: enrolledAt.get(c.course.id) ?? "",
    })),
  );
  const byId = new Map(courses.map((c) => [c.course.id, c]));
  const lessons = views.flatMap((v) => toLessons(byId.get(v.id) as StudentCourse, extras));
  return { courses: views, lessons };
});
