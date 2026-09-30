import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { buildOutline, flattenLessons, type CourseOutline, type OutlineLessonRow } from "./course-outline";
import { isEnrollmentActive } from "./enrollment";
import { courseProgress, type CourseProgress } from "./course-progress";
import { lessonState, type LessonState } from "./lesson-state";
import { lessonsBehindPaywall } from "./paywall";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export interface StudentLesson extends OutlineLessonRow {
  duration_seconds: number | null;
}

export interface StudentCourse {
  course: { id: string; title: string; description: string; category: string; level: string; image: string | null; price: number };
  outline: CourseOutline<StudentLesson>;
  /** Visible lessons in reading order. */
  lessons: StudentLesson[];
  /** Start of the student's ACTIVE enrollment, or null (no access / refunded / expired). */
  enrolledAt: string | null;
  /** Active enrollment with "limited access": content below the paywall needs an upgrade. */
  isLimited: boolean;
  /** Top-level module the paywall follows, if the course has one. */
  paywallAfterModuleId: string | null;
  progress: CourseProgress<StudentLesson>;
  states: ReadonlyMap<string, LessonState>;
  /** A team member viewing a course they aren't enrolled in: every lesson opens (Kajabi "Preview mode"). */
  isStaffPreview: boolean;
}

/**
 * Everything the student course pages render, read with the student's own session so RLS
 * decides what's visible (drafts are hidden; staff see everything for previews).
 */
export async function loadStudentCourse(supabase: ServerSupabase, courseId: string, userId: string): Promise<StudentCourse | null> {
  const [courseRes, modulesRes, lessonsRes, enrollmentRes, progressRes, staffRes] = await Promise.all([
    supabase.from("courses").select("id, title, description, category, level, image, price, paywall_after_module_id").eq("id", courseId).maybeSingle(),
    supabase.from("modules").select("id, parent_id, title, position, published").eq("course_id", courseId),
    supabase
      .from("lessons")
      .select("id, module_id, position, title, published, kind, duration_seconds, free_preview, available_after_days")
      .eq("course_id", courseId),
    supabase.from("enrollments").select("enrolled_at, expires_at, access_level").eq("course_id", courseId).eq("user_id", userId).maybeSingle(),
    supabase.from("lesson_progress").select("lesson_id, completed_at").eq("user_id", userId).not("completed_at", "is", null),
    supabase.rpc("current_staff_role"),
  ]);
  if (!courseRes.data) return null;
  for (const res of [modulesRes, lessonsRes, enrollmentRes, progressRes]) {
    if (res.error) console.error("[learn] course load failed", { courseId, error: res.error.message });
  }

  const outline = buildOutline<StudentLesson>(modulesRes.data ?? [], (lessonsRes.data ?? []) as StudentLesson[]);
  const lessons = flattenLessons(outline);
  const enrolledAt = isEnrollmentActive(enrollmentRes.data) ? (enrollmentRes.data?.enrolled_at ?? null) : null;
  const completed = new Set((progressRes.data ?? []).map((p) => p.lesson_id));
  const now = new Date();
  const isStaffPreview = !enrolledAt && Boolean(staffRes.data);
  const isLimited = Boolean(enrolledAt) && enrollmentRes.data?.access_level === "limited";
  const paywallAfterModuleId = courseRes.data.paywall_after_module_id ?? null;
  const behind = lessonsBehindPaywall(outline, paywallAfterModuleId);

  return {
    course: {
      id: courseRes.data.id,
      title: courseRes.data.title,
      description: courseRes.data.description,
      category: courseRes.data.category,
      level: courseRes.data.level,
      image: courseRes.data.image || null,
      price: Number(courseRes.data.price),
    },
    outline,
    lessons,
    enrolledAt,
    isLimited,
    paywallAfterModuleId,
    progress: courseProgress(lessons, completed),
    states: new Map(lessons.map((l) => [l.id, lessonState(l, { enrolledAt, completed: completed.has(l.id), now, preview: isStaffPreview, limited: isLimited, behindPaywall: behind.has(l.id) })])),
    isStaffPreview,
  };
}
