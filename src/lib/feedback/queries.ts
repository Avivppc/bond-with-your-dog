import "server-only";
import type { createClient } from "@/lib/supabase/server";
import type { LessonOption, MoveOption } from "./subjects";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

const DAY_MS = 86_400_000;

interface MoveRow {
  id: string;
  slug: string;
  name: string;
  lesson_id: string | null;
  lessons: { title: string; position: number } | null;
  courses: { title: string } | null;
}

interface LessonRow {
  id: string;
  title: string;
  course_id: string;
  position: number;
  available_after_days: number | null;
  courses: { title: string } | null;
}

/** Published moves and the lessons open to this member (RLS + their active enrollments). */
export async function loadSubjects(supabase: ServerSupabase, now: Date): Promise<{ moves: MoveOption[]; lessons: LessonOption[] }> {
  const [movesRes, enrollRes] = await Promise.all([
    supabase.from("moves").select("id, slug, name, lesson_id, lessons(title, position), courses(title)").eq("published", true).order("position"),
    supabase.from("enrollments").select("course_id, enrolled_at, expires_at"),
  ]);
  if (movesRes.error) console.error("[feedback] moves load failed", movesRes.error.message);
  if (enrollRes.error) console.error("[feedback] enrollments load failed", enrollRes.error.message);

  const active = (enrollRes.data ?? []).filter((e) => !e.expires_at || new Date(e.expires_at).getTime() > now.getTime());
  const enrolledAt = new Map(active.map((e) => [e.course_id as string, new Date(e.enrolled_at as string).getTime()]));
  let lessons: LessonOption[] = [];
  if (enrolledAt.size > 0) {
    const { data, error } = await supabase
      .from("lessons")
      .select("id, title, course_id, position, available_after_days, courses(title)")
      .in("course_id", [...enrolledAt.keys()])
      .eq("published", true)
      .eq("kind", "video")
      .order("course_id")
      .order("position")
      .returns<LessonRow[]>();
    if (error) console.error("[feedback] lessons load failed", error.message);
    lessons = (data ?? [])
      .filter((l) => (enrolledAt.get(l.course_id) ?? Infinity) + (l.available_after_days ?? 0) * DAY_MS <= now.getTime())
      .map((l) => ({ id: l.id, title: l.title, course_title: l.courses?.title ?? "" }));
  }

  const moves = ((movesRes.data ?? []) as unknown as MoveRow[]).map((m) => ({
    id: m.id,
    slug: m.slug,
    name: m.name,
    lesson_id: m.lesson_id,
    course_title: m.courses?.title ?? null,
    lesson_position: m.lessons?.position ?? null,
  }));
  return { moves, lessons };
}
