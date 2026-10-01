import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { EVENTS, trackMember, type SignedInUser } from "@/lib/analytics-server";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

interface CompletedRow {
  completed_at: string;
  watch_seconds: number;
  lessons: { course_id: string; position: number } | null;
}

/**
 * lesson_completed, keyed to the first completion: complete_lesson keeps the
 * original completed_at, so a rewatch sends the same uuid and timestamp and
 * PostHog keeps one event.
 */
export async function trackLessonCompleted(supabase: ServerSupabase, user: SignedInUser, lessonId: string): Promise<void> {
  const { data, error } = await supabase
    .from("lesson_progress")
    .select("completed_at, watch_seconds, lessons(course_id, position)")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .not("completed_at", "is", null)
    .maybeSingle<CompletedRow>();
  if (error) {
    console.error("[analytics] lesson completion lookup failed", { lessonId, error: error.message });
    return;
  }
  if (!data) return;
  trackMember(
    user,
    EVENTS.lessonCompleted,
    {
      lesson_id: lessonId,
      course_id: data.lessons?.course_id ?? null,
      lesson_position: data.lessons?.position ?? null,
      watch_seconds: data.watch_seconds,
    },
    { dedupeKey: `${user.id}:${lessonId}`, occurredAt: data.completed_at },
  );
}
