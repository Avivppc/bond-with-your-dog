import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { SkillLevel } from "@/lib/member/viewer";
import { parseMoveSteps, type MoveLite } from "../moves";

export interface MoveRow extends MoveLite {
  lessonId: string | null;
  cue: string | null;
  summary: string | null;
  steps: string[];
  videoUrl: string | null;
  imageUrl: string | null;
  gentleAlternative: string | null;
}

export interface DogSkill {
  level: SkillLevel;
  setBy: "member" | "coach";
}

const MOVE_COLUMNS = "id, slug, name, course_id, lesson_id, cue, summary, steps, video_url, image_url, loads_joints, gentle_alternative, position";

interface MoveDbRow {
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
}

function toMove(r: MoveDbRow): MoveRow {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    courseId: r.course_id,
    lessonId: r.lesson_id,
    cue: r.cue,
    summary: r.summary,
    steps: parseMoveSteps(r.steps),
    videoUrl: r.video_url,
    imageUrl: r.image_url || null,
    loadsJoints: r.loads_joints,
    gentleAlternative: r.gentle_alternative,
    position: r.position,
  };
}

/** Every published move (staff previews also only see published ones here). */
export const loadPublishedMoves = cache(async (): Promise<MoveRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("moves").select(MOVE_COLUMNS).eq("published", true).order("position").order("name");
  if (error) console.error("[practice] moves load failed", error.message);
  return ((data ?? []) as MoveDbRow[]).map(toMove);
});

/** A dog's level per move (RLS: only the owner's dogs). */
export const loadDogSkills = cache(async (dogId: string | null): Promise<Map<string, DogSkill>> => {
  if (!dogId) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase.from("dog_skills").select("move_id, level, set_by").eq("dog_id", dogId);
  if (error) console.error("[practice] skills load failed", error.message);
  return new Map((data ?? []).map((s) => [s.move_id as string, { level: s.level as SkillLevel, setBy: s.set_by as "member" | "coach" }]));
});

export function levelMap(skills: ReadonlyMap<string, DogSkill>): Map<string, SkillLevel> {
  return new Map([...skills.entries()].map(([id, s]) => [id, s.level]));
}

/** Fallback artwork for a move without its own image. */
export const MOVE_FALLBACK_IMAGE = "/app/img/intro.jpg";
