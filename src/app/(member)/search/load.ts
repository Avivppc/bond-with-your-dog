import "server-only";
import { createClient } from "@/lib/supabase/server";
import { loadStudentCourse } from "@/lib/student-course-server";
import { excerpt, ilikePattern, rankLessons, type SearchHit } from "@/lib/practice/search";
import { formatTimecode } from "@/lib/practice/timeline";
import { isoDateInZone, longDateLabel } from "@/lib/practice/dates";
import type { SkillLevel } from "@/lib/member/viewer";

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

const LIMIT = 12;
/** Lesson hits from at most this many courses get a lesson number / lock state. */
const MAX_COURSES = 6;

export interface MoveHit extends SearchHit {
  level: SkillLevel | null;
}

function minutes(seconds: number | null): string | null {
  return seconds ? `${Math.max(1, Math.round(seconds / 60))} min` : null;
}

export async function searchLessons(supabase: ServerSupabase, userId: string, q: string): Promise<SearchHit[]> {
  const pattern = ilikePattern(q);
  const columns = "id, title, course_id, duration_seconds, thumbnail_url";
  // Title matches are fetched on their own so description-only matches can't crowd them out.
  const [byTitle, byDescription] = await Promise.all([
    supabase.from("lessons").select(columns).ilike("title", pattern).order("title").limit(LIMIT),
    supabase.from("lessons").select(columns).ilike("description", pattern).order("title").limit(LIMIT),
  ]);
  for (const res of [byTitle, byDescription]) if (res.error) console.error("[search] lessons failed", res.error.message);
  const seen = new Set<string>();
  const rows = [...(byTitle.data ?? []), ...(byDescription.data ?? [])].filter((r) => (seen.has(r.id as string) ? false : (seen.add(r.id as string), true)));
  const courseIds = [...new Set(rows.map((r) => r.course_id as string))].slice(0, MAX_COURSES);
  const courses = (await Promise.all(courseIds.map((id) => loadStudentCourse(supabase, id, userId)))).filter((c) => c !== null);
  const byCourse = new Map(courses.map((c) => [c.course.id, c]));

  const hits = rows.flatMap((r) => {
    const course = byCourse.get(r.course_id as string);
    if (!course) return [];
    const index = course.lessons.findIndex((l) => l.id === r.id);
    if (index === -1) return [];
    const state = course.states.get(r.id as string)?.kind;
    const locked = state !== "open" && state !== "completed";
    const bits = [course.course.title, `Lesson ${index + 1}`, locked ? (state === "scheduled" ? "opens soon" : "locked") : minutes(r.duration_seconds as number | null)];
    return [
      {
        id: r.id as string,
        title: r.title as string,
        subtitle: bits.filter(Boolean).join(" · "),
        href: locked ? `/learn/${course.course.id}` : `/learn/${course.course.id}/${r.id}`,
        locked,
        image: (r.thumbnail_url as string | null) || course.course.image,
      },
    ];
  });
  return rankLessons(hits, q).slice(0, LIMIT);
}

export async function searchMoves(supabase: ServerSupabase, dogId: string | null, q: string): Promise<MoveHit[]> {
  const pattern = ilikePattern(q);
  const { data, error } = await supabase
    .from("moves")
    .select("id, slug, name, cue, summary, image_url")
    .eq("published", true)
    .or(`name.ilike.${pattern},cue.ilike.${pattern},summary.ilike.${pattern}`)
    .order("position")
    .limit(LIMIT);
  if (error) console.error("[search] moves failed", error.message);
  const ids = (data ?? []).map((m) => m.id as string);
  const skills = dogId && ids.length ? (await supabase.from("dog_skills").select("move_id, level").eq("dog_id", dogId).in("move_id", ids)).data ?? [] : [];
  const levels = new Map(skills.map((s) => [s.move_id as string, s.level as SkillLevel]));
  return (data ?? []).map((m) => ({
    id: m.id as string,
    title: m.name as string,
    subtitle: [m.cue ? `Cue: “${m.cue}”` : null, m.summary ? excerpt(m.summary as string, q, 40) : null].filter(Boolean).join(" · "),
    href: `/moves?move=${m.slug}`,
    image: (m.image_url as string | null) || null,
    level: levels.get(m.id as string) ?? null,
  }));
}

interface NoteRow {
  id: string;
  body: string;
  at_seconds: number;
  video_id: string;
  feedback_videos: { title: string; created_at: string } | null;
}

/** The member's own videos and Roni's notes on them (RLS: own videos only). */
export async function searchFeedback(supabase: ServerSupabase, q: string, timeZone: string): Promise<SearchHit[]> {
  const pattern = ilikePattern(q);
  const [videos, notes] = await Promise.all([
    supabase.from("feedback_videos").select("id, title, note, created_at").or(`title.ilike.${pattern},note.ilike.${pattern}`).order("created_at", { ascending: false }).limit(LIMIT),
    supabase.from("feedback_notes").select("id, body, at_seconds, video_id, feedback_videos(title, created_at)").ilike("body", pattern).order("created_at", { ascending: false }).limit(LIMIT),
  ]);
  if (videos.error) console.error("[search] feedback videos failed", videos.error.message);
  if (notes.error) console.error("[search] feedback notes failed", notes.error.message);
  const noteHits = ((notes.data ?? []) as unknown as NoteRow[]).map((n) => ({
    id: `note-${n.id}`,
    title: `“${excerpt(n.body, q, 50)}”`,
    subtitle: [n.feedback_videos ? `On your “${n.feedback_videos.title}” video` : "Roni's note", `at ${formatTimecode(Number(n.at_seconds))}`].join(" · "),
    href: `/feedback/${n.video_id}`,
  }));
  const videoHits = (videos.data ?? []).map((v) => ({
    id: `video-${v.id}`,
    title: v.title as string,
    subtitle: `Your video · ${longDateLabel(isoDateInZone(new Date(v.created_at as string), timeZone))}`,
    href: `/feedback/${v.id}`,
  }));
  return [...noteHits, ...videoHits].slice(0, LIMIT);
}

/** Past live Q&As with a recording (RLS: community members). */
export async function searchRecordings(supabase: ServerSupabase, q: string, timeZone: string): Promise<SearchHit[]> {
  const pattern = ilikePattern(q);
  const { data, error } = await supabase
    .from("community_meetups")
    .select("id, title, starts_at, recording_minutes")
    .eq("kind", "live_qa")
    .not("recording_url", "is", null)
    .or(`title.ilike.${pattern},description.ilike.${pattern}`)
    .order("starts_at", { ascending: false })
    .limit(LIMIT);
  if (error) console.error("[search] recordings failed", error.message);
  return (data ?? []).map((m) => ({
    id: m.id as string,
    title: m.title as string,
    subtitle: [`Live Q&A · ${longDateLabel(isoDateInZone(new Date(m.starts_at as string), timeZone))}`, m.recording_minutes ? `${m.recording_minutes} min recording` : "Recording"].join(" · "),
    href: `/community/meetups/${m.id}`,
  }));
}

/** A few real move names to suggest when nothing matched. */
export async function suggestionTerms(supabase: ServerSupabase): Promise<string[]> {
  const { data } = await supabase.from("moves").select("name").eq("published", true).order("position").limit(4);
  return (data ?? []).map((m) => m.name as string);
}
