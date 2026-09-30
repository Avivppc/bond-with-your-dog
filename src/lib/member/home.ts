import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isEnrollmentActive } from "@/lib/enrollment";
import { loadStudentCourse, type StudentCourse, type StudentLesson } from "@/lib/student-course-server";
import type { MemberViewer, SkillLevel } from "./viewer";
import { buildWeek, isoDate, startOfWeek, type WeekDay } from "./week";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export interface EnrolledCourse {
  courseId: string;
  chapterNumber: number | null;
  enrolledAt: string;
}

export interface HomeSkill {
  moveId: string;
  name: string;
  image: string | null;
  level: SkillLevel;
}

export interface HomeData {
  enrolled: EnrolledCourse[];
  current: StudentCourse | null;
  next: StudentLesson | null;
  nextNumber: number;
  dayOne: boolean;
  week: WeekDay[];
  lastPractice: { practicedOn: string; minutes: number; moveName: string | null; lessonTitle: string | null } | null;
  feedback: { id: string; title: string; summary: string | null; repliedAt: string; unread: boolean } | null;
  skills: HomeSkill[];
  liveQa: { id: string; title: string; startsAt: string; durationMinutes: number } | null;
  whatsappUrl: string | null;
  movesCount: number;
}

/** Active enrollments, in chapter order (then newest first). */
export async function loadEnrolled(supabase: ServerSupabase): Promise<EnrolledCourse[]> {
  const { data, error } = await supabase
    .from("enrollments")
    .select("course_id, enrolled_at, expires_at, courses(chapter_number)")
    .order("enrolled_at", { ascending: false });
  if (error) console.error("[home] enrollments load failed", error.message);
  return (data ?? [])
    .filter((e) => isEnrollmentActive(e))
    .map((e) => ({
      courseId: e.course_id,
      enrolledAt: e.enrolled_at,
      chapterNumber: (e.courses as unknown as { chapter_number: number | null } | null)?.chapter_number ?? null,
    }))
    .sort((a, b) => (a.chapterNumber ?? 99) - (b.chapterNumber ?? 99));
}

/** The course to continue: the first (by chapter) that still has lessons left, else the last one. */
async function currentCourse(supabase: ServerSupabase, userId: string, enrolled: EnrolledCourse[]): Promise<StudentCourse | null> {
  let fallback: StudentCourse | null = null;
  for (const e of enrolled) {
    const course = await loadStudentCourse(supabase, e.courseId, userId);
    if (!course) continue;
    if (course.progress.next) return course;
    fallback = course;
  }
  return fallback;
}

export async function loadHome(viewer: MemberViewer): Promise<HomeData> {
  const supabase = await createClient();
  const today = new Date();
  const monday = isoDate(startOfWeek(today));
  const dogId = viewer.activeDog?.id ?? null;
  const nowIso = today.toISOString();

  const enrolled = await loadEnrolled(supabase);
  const [current, sessionsRes, planRes, feedbackRes, skillsRes, qaRes, settingsRes, movesRes, anyProgressRes] = await Promise.all([
    currentCourse(supabase, viewer.userId, enrolled),
    supabase
      .from("practice_sessions")
      .select("practiced_on, duration_seconds, dog_id, moves(name), lessons(title)")
      .order("practiced_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60),
    supabase.from("practice_plan").select("planned_on, minutes, dog_id").gte("planned_on", monday),
    supabase
      .from("feedback_videos")
      .select("id, title, summary, replied_at, member_read_at")
      .eq("status", "replied")
      .order("replied_at", { ascending: false })
      .limit(1),
    dogId
      ? supabase.from("dog_skills").select("move_id, level, moves(name, image_url, position)").eq("dog_id", dogId)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("community_meetups")
      .select("id, title, starts_at, duration_minutes")
      .eq("kind", "live_qa")
      .eq("canceled", false)
      .gte("starts_at", nowIso)
      .order("starts_at")
      .limit(1),
    supabase.from("community_settings").select("whatsapp_url").eq("id", 1).maybeSingle(),
    supabase.from("moves").select("id", { count: "exact", head: true }),
    supabase.from("lesson_progress").select("lesson_id", { count: "exact", head: true }).not("completed_at", "is", null),
  ]);

  // Each dog keeps its own rhythm; sessions logged without a dog count for everyone.
  const sessions = (
    (sessionsRes.data ?? []) as unknown as {
      practiced_on: string;
      duration_seconds: number;
      dog_id: string | null;
      moves: { name: string } | null;
      lessons: { title: string } | null;
    }[]
  ).filter((s) => !dogId || !s.dog_id || s.dog_id === dogId);
  const plan = ((planRes.data ?? []) as { planned_on: string; minutes: number; dog_id: string | null }[]).filter((p) => !dogId || !p.dog_id || p.dog_id === dogId);
  const week = buildWeek({
    today,
    practicedOn: sessions.filter((s) => s.practiced_on >= monday).map((s) => s.practiced_on),
    planned: plan.map((p) => ({ date: p.planned_on, minutes: p.minutes })),
    practiceDays: viewer.profile.practice_days,
    sessionMinutes: viewer.profile.session_minutes,
  });

  const next = current?.progress.next ?? current?.lessons[0] ?? null;
  const fb = feedbackRes.data?.[0];
  const qa = qaRes.data?.[0];
  const last = sessions[0];

  return {
    enrolled,
    current,
    next,
    nextNumber: next && current ? current.lessons.findIndex((l) => l.id === next.id) + 1 : 0,
    dayOne: (anyProgressRes.count ?? 0) === 0 && sessions.length === 0,
    week,
    lastPractice: last
      ? { practicedOn: last.practiced_on, minutes: Math.round(last.duration_seconds / 60), moveName: last.moves?.name ?? null, lessonTitle: last.lessons?.title ?? null }
      : null,
    feedback: fb ? { id: fb.id, title: fb.title, summary: fb.summary, repliedAt: fb.replied_at, unread: !fb.member_read_at } : null,
    skills: ((skillsRes.data ?? []) as unknown as { move_id: string; level: SkillLevel; moves: { name: string; image_url: string | null; position: number } | null }[])
      .filter((s) => s.moves)
      .sort((a, b) => (a.moves!.position ?? 0) - (b.moves!.position ?? 0))
      .map((s) => ({ moveId: s.move_id, name: s.moves!.name, image: s.moves!.image_url, level: s.level })),
    liveQa: qa ? { id: qa.id, title: qa.title, startsAt: qa.starts_at, durationMinutes: qa.duration_minutes } : null,
    whatsappUrl: settingsRes.data?.whatsapp_url ?? null,
    movesCount: movesRes.count ?? 0,
  };
}
