import "server-only";
import { createClient } from "@/lib/supabase/server";
import { parseVimeoUrl, vimeoEmbedUrl } from "@/lib/video/vimeo";
import { parsePracticeSteps, type PracticeStep } from "@/lib/practice/session";
import { loadPublishedMoves, type MoveRow } from "@/lib/practice/server/moves";
import type { CatalogLesson } from "@/lib/practice/catalog";
import type { MediaSpec } from "./PracticeMedia";

export interface LessonDetail {
  id: string;
  title: string;
  courseId: string;
  courseTitle: string;
  number: number | null;
  steps: PracticeStep[];
  practiceMinutes: number | null;
  cues: string[];
  thumbnail: string | null;
  courseImage: string | null;
}

/** The lesson's practice content; null when it doesn't exist or isn't visible to the member. */
export async function loadLessonDetail(lessonId: string, fromCatalog: CatalogLesson | null): Promise<LessonDetail | null> {
  const supabase = await createClient();
  const { data: l, error } = await supabase
    .from("lessons")
    .select("id, title, course_id, practice_steps, practice_minutes, cues, thumbnail_url")
    .eq("id", lessonId)
    .maybeSingle();
  if (error) console.error("[practice] lesson load failed", { lessonId, error: error.message });
  if (!l) return null;
  const { data: course } = await supabase.from("courses").select("title, image").eq("id", l.course_id).maybeSingle();
  return {
    id: l.id,
    title: l.title,
    courseId: l.course_id,
    courseTitle: course?.title ?? fromCatalog?.courseTitle ?? "",
    number: fromCatalog?.number ?? null,
    steps: parsePracticeSteps(l.practice_steps),
    practiceMinutes: l.practice_minutes ?? null,
    cues: (l.cues ?? []).filter(Boolean),
    thumbnail: l.thumbnail_url || null,
    courseImage: course?.image || null,
  };
}

export async function canAccessLesson(lessonId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("can_access_lesson", { p_lesson_id: lessonId });
  if (error) console.error("[practice] access check failed", { lessonId, error: error.message });
  return data === true;
}

/** The move this session trains: the one asked for, else the lesson's only move. */
export async function practiceMove(lessonId: string, slug: string | null): Promise<MoveRow | null> {
  const moves = await loadPublishedMoves();
  if (slug) {
    const asked = moves.find((m) => m.slug === slug);
    if (asked) return asked;
  }
  const ofLesson = moves.filter((m) => m.lessonId === lessonId);
  return ofLesson.length === 1 ? ofLesson[0] : null;
}

const FALLBACK_ART = "/app/img/lure.jpg";

export function pickMedia(lesson: LessonDetail, move: MoveRow | null): MediaSpec {
  if (move?.videoUrl) {
    const vimeo = parseVimeoUrl(move.videoUrl);
    if (vimeo) {
      const url = new URL(vimeoEmbedUrl(vimeo));
      url.searchParams.set("background", "1"); // muted, looping, no controls
      return { kind: "vimeo", src: url.toString(), caption: `Looping: ${move.name}` };
    }
    if (/\.(mp4|webm|mov)(\?|$)/i.test(move.videoUrl)) return { kind: "video", src: move.videoUrl, caption: `Looping: ${move.name}` };
  }
  if (move?.imageUrl) return { kind: "image", src: move.imageUrl, alt: move.name, caption: move.summary ?? move.name };
  const src = lesson.thumbnail ?? lesson.courseImage ?? FALLBACK_ART;
  return { kind: "image", src, alt: "", caption: `From the lesson: ${lesson.title}` };
}
