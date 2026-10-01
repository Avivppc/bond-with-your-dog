import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AchievementDef } from "@/lib/practice/achievements";
import type { SkillLevel } from "@/lib/member/viewer";
import type { SkillEvent } from "@/lib/practice/skill-history";

export interface ProgressData {
  completedLessons: number;
  /** All of the member's sessions (every dog): date, dog, move, reps. */
  sessions: { practicedOn: string; dogId: string | null; moveId: string | null; reps: number }[];
  defs: AchievementDef[];
  earned: Map<string, string>;
  feedbackVideos: number;
  routines: number;
}

/** Upper bound on sessions read for streaks and per-move stats (years of daily practice). */
const MAX_SESSIONS = 5000;

export async function loadProgressData(userId: string): Promise<ProgressData> {
  const supabase = await createClient();
  const [progressRes, sessionsRes, defsRes, earnedRes, videosRes, routinesRes] = await Promise.all([
    supabase.from("lesson_progress").select("id", { count: "exact", head: true }).eq("user_id", userId).not("completed_at", "is", null),
    supabase.from("practice_sessions").select("practiced_on, dog_id, move_id, reps").eq("user_id", userId).order("practiced_on").limit(MAX_SESSIONS),
    supabase.from("achievement_defs").select("code, title, description, icon, rule"),
    supabase.from("achievements").select("code, earned_at").eq("user_id", userId),
    supabase.from("feedback_videos").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabase.from("routines").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  for (const [name, res] of Object.entries({ progressRes, sessionsRes, defsRes, earnedRes, videosRes, routinesRes })) {
    if (res.error) console.error(`[progress] ${name} failed`, res.error.message);
  }
  return {
    completedLessons: progressRes.count ?? 0,
    sessions: (sessionsRes.data ?? []).map((s) => ({
      practicedOn: s.practiced_on as string,
      dogId: (s.dog_id as string | null) ?? null,
      moveId: (s.move_id as string | null) ?? null,
      reps: (s.reps as number) ?? 0,
    })),
    defs: (defsRes.data ?? []) as AchievementDef[],
    earned: new Map((earnedRes.data ?? []).map((a) => [a.code as string, a.earned_at as string])),
    feedbackVideos: videosRes.count ?? 0,
    routines: routinesRes.count ?? 0,
  };
}

/** Upper bound on skill-level changes read for one dog (each move changes level a handful of times). */
const MAX_SKILL_EVENTS = 1000;

/** The dog's skill-level history, oldest first (RLS: only the owner's dogs). */
export async function loadSkillEvents(dogId: string): Promise<SkillEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dog_skill_events")
    .select("move_id, from_level, to_level, set_by, created_at")
    .eq("dog_id", dogId)
    .order("created_at")
    .limit(MAX_SKILL_EVENTS);
  if (error) console.error("[progress] skill events failed", { dogId, error: error.message });
  return (data ?? []).map((e) => ({
    moveId: e.move_id as string,
    fromLevel: (e.from_level as SkillLevel | null) ?? null,
    toLevel: e.to_level as SkillLevel,
    setBy: e.set_by as SkillEvent["setBy"],
    createdAt: e.created_at as string,
  }));
}
