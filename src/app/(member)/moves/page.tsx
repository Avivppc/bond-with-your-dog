import Link from "next/link";
import { requireMember } from "@/lib/member/viewer";
import { createClient } from "@/lib/supabase/server";
import { StateCard } from "@/components/app/ui";
import { parseVimeoUrl, vimeoEmbedUrl } from "@/lib/video/vimeo";
import { sortCourses } from "@/lib/practice/catalog";
import { loadPracticeCatalog } from "@/lib/practice/server/catalog";
import { loadDogSkills, loadPublishedMoves, MOVE_FALLBACK_IMAGE, type MoveRow } from "@/lib/practice/server/moves";
import { MovesBrowser } from "./MovesBrowser";
import type { MoveView } from "./types";

export const metadata = { title: "Moves Library · Bonded" };

type Search = Promise<Record<string, string | string[] | undefined>>;

function clipOf(m: MoveRow): MoveView["clip"] {
  if (!m.videoUrl) return null;
  const vimeo = parseVimeoUrl(m.videoUrl);
  if (vimeo) return { kind: "vimeo", src: vimeoEmbedUrl(vimeo) };
  return /\.(mp4|webm|mov)(\?|$)/i.test(m.videoUrl) ? { kind: "video", src: m.videoUrl } : null;
}

export default async function MovesPage({ searchParams }: { searchParams: Search }) {
  const viewer = await requireMember("/moves");
  const sp = await searchParams;
  const dog = viewer.activeDog;
  const [moves, skills, catalog] = await Promise.all([loadPublishedMoves(), loadDogSkills(dog?.id ?? null), loadPracticeCatalog(viewer.userId)]);

  const head = (
    <div className="between">
      <div className="head-block">
        <span className="eyebrow">Reference</span>
        <h1 className="h1">Moves Library</h1>
        <p className="lede">Every move from the course, with its cue, steps{dog ? ` and ${dog.name}'s current level` : ""}.</p>
      </div>
    </div>
  );

  if (moves.length === 0) {
    return (
      <>
        {head}
        <StateCard
          icon="auto_stories"
          eyebrow="Moves Library"
          title="Roni is still adding the moves"
          action={
            <Link className="btn btn-primary" href="/my-courses">
              Continue your lessons
            </Link>
          }
        >
          Each move gets its cue, steps and a short clip. They&apos;ll appear here as soon as they&apos;re published.
        </StateCard>
      </>
    );
  }

  const courseIds = [...new Set(moves.map((m) => m.courseId).filter((id): id is string => Boolean(id)))];
  const supabase = await createClient();
  const { data: courseRows } = courseIds.length
    ? await supabase.from("courses").select("id, title, chapter_number").in("id", courseIds)
    : { data: [] as { id: string; title: string; chapter_number: number | null }[] };
  const courses = sortCourses((courseRows ?? []).map((c) => ({ id: c.id as string, title: c.title as string, chapterNumber: c.chapter_number as number | null })));
  const courseTitle = new Map(courses.map((c) => [c.id, c.title]));
  const lessonNumber = new Map(catalog.lessons.map((l) => [l.id, l.number]));

  const views: MoveView[] = moves.map((m) => {
    const skill = skills.get(m.id);
    return {
      id: m.id,
      slug: m.slug,
      name: m.name,
      courseId: m.courseId,
      courseTitle: m.courseId ? courseTitle.get(m.courseId) ?? null : null,
      lessonId: m.lessonId,
      lessonNumber: m.lessonId ? lessonNumber.get(m.lessonId) ?? null : null,
      cue: m.cue,
      summary: m.summary,
      steps: m.steps,
      image: m.imageUrl ?? MOVE_FALLBACK_IMAGE,
      clip: clipOf(m),
      loadsJoints: m.loadsJoints,
      gentleAlternative: m.gentleAlternative,
      position: m.position,
      level: skill?.level ?? null,
      setByCoach: skill?.setBy === "coach",
    };
  });
  const requested = typeof sp.move === "string" ? sp.move : null;
  const initialSlug = views.find((v) => v.slug === requested)?.slug ?? views[0].slug;

  return (
    <>
      {head}
      <MovesBrowser
        moves={views}
        courses={courses.map((c) => ({ id: c.id, title: c.title }))}
        dog={dog ? { id: dog.id, name: dog.name, limitations: dog.limitations } : null}
        initialSlug={initialSlug}
        initialFilter={typeof sp.filter === "string" ? sp.filter : undefined}
      />
    </>
  );
}
