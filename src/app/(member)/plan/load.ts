import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DoneSession, PlannedSession } from "@/lib/practice/week-plan";
import type { MonthSession } from "@/lib/practice/month";
import { DEFAULT_SESSION_TITLE } from "@/lib/practice/week-plan";

interface SessionRow {
  id: string;
  practiced_on: string;
  duration_seconds: number;
  created_at: string;
  lessons: { title: string } | null;
  moves: { name: string } | null;
}

interface PlanRow {
  id: string;
  planned_on: string;
  minutes: number;
  lesson_id: string | null;
  lessons: { title: string } | null;
}

export interface PlanData {
  done: DoneSession[];
  month: MonthSession[];
  planned: PlannedSession[];
}

/** Sessions for the dog between two dates (the week and the month shown) and the week's plan. */
export async function loadPlanData(dogId: string, range: { from: string; to: string }, week: { from: string; to: string }): Promise<PlanData> {
  const supabase = await createClient();
  const [sessionsRes, planRes] = await Promise.all([
    supabase
      .from("practice_sessions")
      .select("id, practiced_on, duration_seconds, created_at, lessons(title), moves(name)")
      .eq("dog_id", dogId)
      .gte("practiced_on", range.from)
      .lte("practiced_on", range.to)
      .order("created_at"),
    supabase
      .from("practice_plan")
      .select("id, planned_on, minutes, lesson_id, lessons(title)")
      .or(`dog_id.eq.${dogId},dog_id.is.null`)
      .gte("planned_on", week.from)
      .lte("planned_on", week.to)
      .order("created_at"),
  ]);
  if (sessionsRes.error) console.error("[plan] sessions load failed", sessionsRes.error.message);
  if (planRes.error) console.error("[plan] plan load failed", planRes.error.message);

  const sessions = (sessionsRes.data ?? []) as unknown as SessionRow[];
  const plans = (planRes.data ?? []) as unknown as PlanRow[];
  return {
    done: sessions.map((s) => ({
      id: s.id,
      practicedOn: s.practiced_on,
      durationSeconds: s.duration_seconds,
      title: s.moves?.name ?? s.lessons?.title ?? DEFAULT_SESSION_TITLE,
    })),
    month: sessions.map((s) => ({ practicedOn: s.practiced_on, durationSeconds: s.duration_seconds, createdAt: s.created_at })),
    planned: plans.map((p) => ({
      id: p.id,
      plannedOn: p.planned_on,
      minutes: p.minutes,
      lessonId: p.lesson_id,
      title: p.lessons?.title ?? DEFAULT_SESSION_TITLE,
    })),
  };
}
