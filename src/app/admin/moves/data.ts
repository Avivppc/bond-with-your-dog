import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { buildOutline, flattenLessons, type OutlineLessonRow, type OutlineModuleRow } from "@/lib/course-outline";
import type { CourseOption, LessonOption } from "./MoveForm";

export interface MoveRow {
  id: string;
  slug: string;
  name: string;
  course_id: string | null;
  lesson_id: string | null;
  cue: string | null;
  summary: string | null;
  steps: unknown;
  video_url: string | null;
  image_url: string | null;
  loads_joints: boolean;
  gentle_alternative: string | null;
  position: number;
  published: boolean;
}

export const MOVE_COLUMNS =
  "id, slug, name, course_id, lesson_id, cue, summary, steps, video_url, image_url, loads_joints, gentle_alternative, position, published";

type LessonRow = OutlineLessonRow & { course_id: string };

/** Courses (by chapter, then title) and every lesson in reading order, for the course/lesson pickers. */
export async function loadPlacementOptions(): Promise<{ courses: CourseOption[]; lessons: LessonOption[] }> {
  const sb = createServiceClient();
  const [coursesRes, modulesRes, lessonsRes] = await Promise.all([
    sb.from("courses").select("id, title, chapter_number").order("chapter_number", { ascending: true, nullsFirst: false }).order("title"),
    sb.from("modules").select("id, course_id, parent_id, title, position, published"),
    sb.from("lessons").select("id, course_id, module_id, title, position, published, kind, free_preview, available_after_days"),
  ]);
  const failed = coursesRes.error ?? modulesRes.error ?? lessonsRes.error;
  if (failed) console.error("[admin/moves] placement options load failed", failed.message);

  const courses = (coursesRes.data ?? []) as CourseOption[];
  const modules = (modulesRes.data ?? []) as (OutlineModuleRow & { course_id: string })[];
  const lessons = (lessonsRes.data ?? []) as LessonRow[];
  const ordered = courses.flatMap((c) =>
    flattenLessons(buildOutline(modules.filter((m) => m.course_id === c.id), lessons.filter((l) => l.course_id === c.id)))
  );
  return {
    courses: courses.map(({ id, title }) => ({ id, title })),
    lessons: ordered.map(({ id, title, course_id }) => ({ id, title, course_id })),
  };
}
