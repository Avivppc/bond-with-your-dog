import Link from "next/link";
import { z } from "zod";
import { requireMember } from "@/lib/member/viewer";
import { Ms, StateCard } from "@/components/app/ui";
import { buildStages } from "@/lib/practice/session";
import { pickPracticeLesson } from "@/lib/practice/catalog";
import { loadPracticeCatalog } from "@/lib/practice/server/catalog";
import { NoDogCard } from "./_components/NoDogCard";
import { LessonPicker } from "./LessonPicker";
import { PracticeSession } from "./PracticeSession";
import { PracticeMedia } from "./PracticeMedia";
import { canAccessLesson, loadLessonDetail, pickMedia, practiceMove, type LessonDetail } from "./load";

export const metadata = { title: "Practice · Bonded" };

type Search = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined): string | null {
  return typeof v === "string" ? v : null;
}

function Header({ eyebrow, title, lede }: { eyebrow: string; title: string; lede?: string }) {
  return (
    <div className="between">
      <div className="head-block">
        <span className="eyebrow">{eyebrow}</span>
        <h1 className="h1">{title}</h1>
        {lede && <p className="lede">{lede}</p>}
      </div>
      <Link className="btn btn-ghost btn-sm" href="/plan">
        <Ms name="calendar_month" size="sm" />
        Your week
      </Link>
    </div>
  );
}

function lessonEyebrow(l: LessonDetail): string {
  return ["Practice", l.courseTitle, l.number ? `Lesson ${l.number}` : null].filter(Boolean).join(" · ");
}

export default async function PracticePage({ searchParams }: { searchParams: Search }) {
  const viewer = await requireMember("/practice");
  const sp = await searchParams;
  const dog = viewer.activeDog;
  if (!dog) {
    return (
      <>
        <Header eyebrow="Practice" title="Practice mode" />
        <NoDogCard eyebrow="Practice" what="Sessions are saved for your dog, so add them first. It takes a minute." />
      </>
    );
  }

  const requested = z.string().uuid().safeParse(one(sp.lesson)).success ? (one(sp.lesson) as string) : null;
  const catalog = await loadPracticeCatalog(viewer.userId);
  const title = `Practise with ${dog.name}`;

  if (one(sp.pick)) {
    return (
      <>
        <Header eyebrow="Practice" title={title} lede="Choose the lesson you want to practise today." />
        <LessonPicker courses={catalog.courses} lessons={catalog.lessons} />
      </>
    );
  }

  // A lesson outside the member's courses (e.g. a free preview) opens when the database allows it.
  const inCatalog = requested ? catalog.lessons.find((l) => l.id === requested) ?? null : null;
  const requestedOpen = requested ? (inCatalog ? inCatalog.accessible : await canAccessLesson(requested)) : false;
  const chosenId = requestedOpen ? requested : pickPracticeLesson(catalog.lessons, null)?.id ?? null;
  const note = requested && !requestedOpen ? "That lesson isn't open for you yet, so here are the lessons you can practise." : undefined;

  if (!chosenId || (requested && !requestedOpen)) {
    return (
      <>
        <Header eyebrow="Practice" title={title} lede="Short and often beats long and rare." />
        <LessonPicker courses={catalog.courses} lessons={catalog.lessons} note={note} />
      </>
    );
  }

  const lesson = await loadLessonDetail(chosenId, catalog.lessons.find((l) => l.id === chosenId) ?? null);
  if (!lesson) {
    return (
      <>
        <Header eyebrow="Practice" title={title} />
        <LessonPicker courses={catalog.courses} lessons={catalog.lessons} note="We couldn't find that lesson." />
      </>
    );
  }
  const lessonHref = `/learn/${lesson.courseId}/${lesson.id}`;

  if (lesson.steps.length === 0) {
    return (
      <>
        <Header eyebrow={lessonEyebrow(lesson)} title={lesson.title} />
        <StateCard
          icon="checklist"
          eyebrow="Practice steps"
          title="Roni hasn't added practice steps to this lesson yet"
          action={
            <div className="row" style={{ justifyContent: "center" }}>
              <Link className="btn btn-primary" href={lessonHref}>
                <Ms name="play_arrow" size="sm" />
                Watch the lesson
              </Link>
              <Link className="btn btn-ghost" href="/practice?pick=1">
                Choose another lesson
              </Link>
            </div>
          }
        >
          Steps are added lesson by lesson. Until then, practise along with the video.
        </StateCard>
      </>
    );
  }

  const move = await practiceMove(lesson.id, one(sp.move));
  const sessionMinutes = lesson.practiceMinutes ?? viewer.profile.session_minutes;
  const cues = move?.cue ? [move.cue] : lesson.cues;

  return (
    <PracticeSession
      key={lesson.id}
      lesson={{ id: lesson.id, title: lesson.title, href: lessonHref, eyebrow: lessonEyebrow(lesson) }}
      dog={{ id: dog.id, name: dog.name }}
      moveId={move?.id ?? null}
      stages={buildStages(lesson.steps, sessionMinutes, dog.name)}
      chips={[...cues.slice(0, 2).map((c) => `Cue: "${c}"`), ...(move ? [`Move: ${move.name}`] : [])]}
      media={<PracticeMedia media={pickMedia(lesson, move)} />}
    />
  );
}
