import { requireMember } from "@/lib/member/viewer";
import { isoDateInZone, longDateLabel } from "@/lib/practice/dates";
import { longestStreak } from "@/lib/practice/streaks";
import { aggregatePractice, movesReady, nextMilestone, progressOrder } from "@/lib/practice/moves";
import { buildAchievements, type AchievementDef } from "@/lib/practice/achievements";
import { viewerToday } from "@/lib/practice/server/zone";
import { loadPracticeCatalog } from "@/lib/practice/server/catalog";
import { levelMap, loadDogSkills, loadPublishedMoves, MOVE_FALLBACK_IMAGE } from "@/lib/practice/server/moves";
import { NoDogCard } from "../practice/_components/NoDogCard";
import { TimeZoneSync } from "../practice/_components/TimeZoneSync";
import { historyLine, recentMilestones, summarizeSkillHistory } from "@/lib/practice/skill-history";
import { loadProgressData, loadSkillEvents } from "./load";
import { RecentMilestonesCard } from "./history";
import { AchievementsSection, DogHeader, MilestoneCard, MovesCard, MultiDogTip, NoMilestoneCard, PathSection } from "./sections";

export const metadata = { title: "Progress" };

/** Moves shown on the progress card before "All N moves". */
const MOVES_SHOWN = 8;
/** Step-ups listed under "Recent milestones". */
const MILESTONES_SHOWN = 4;
const ACHIEVEMENT_ORDER = ["first_practice", "first_lesson", "three_lessons", "rhythm_6", "first_feedback", "ten_lessons", "course_complete", "first_routine"];

function orderDefs(defs: AchievementDef[]): AchievementDef[] {
  const rank = (code: string) => (ACHIEVEMENT_ORDER.includes(code) ? ACHIEVEMENT_ORDER.indexOf(code) : ACHIEVEMENT_ORDER.length);
  return [...defs].sort((a, b) => rank(a.code) - rank(b.code) || a.title.localeCompare(b.title));
}

export default async function ProgressPage() {
  const viewer = await requireMember("/progress");
  const dog = viewer.activeDog;
  if (!dog) {
    return (
      <>
        <div className="head-block">
          <span className="eyebrow">Progress</span>
          <h1 className="h1">Your journey</h1>
        </div>
        <NoDogCard eyebrow="Progress" what="Progress is tracked per dog: sessions, moves and milestones." />
      </>
    );
  }

  const [{ today, timeZone }, catalog, moves, skills, data, skillEvents] = await Promise.all([
    viewerToday(),
    loadPracticeCatalog(viewer.userId),
    loadPublishedMoves(),
    loadDogSkills(dog.id),
    loadProgressData(viewer.userId),
    loadSkillEvents(dog.id),
  ]);
  const levels = levelMap(skills);
  const dogSessions = data.sessions.filter((s) => s.dogId === dog.id);

  // "Training since": this dog's first session, else the first course enrollment.
  const firstEnrollment = catalog.courses.map((c) => c.enrolledAt).filter(Boolean).sort()[0];
  const sinceIso = dogSessions[0]?.practicedOn ?? (firstEnrollment ? isoDateInZone(new Date(firstEnrollment), timeZone) : null);
  const since = sinceIso ? `${longDateLabel(sinceIso)}${sinceIso.slice(0, 4) === isoDateInZone(new Date(), timeZone).slice(0, 4) ? "" : `, ${sinceIso.slice(0, 4)}`}` : null;

  const courseTitle = new Map(catalog.courses.map((c) => [c.id, c.title]));
  const lessonNumber = new Map(catalog.lessons.map((l) => [l.id, l.number]));
  const history = summarizeSkillHistory(skillEvents, levels, timeZone);
  const ordered = progressOrder(moves, levels);
  const rows = ordered.slice(0, MOVES_SHOWN).map((m) => ({
    id: m.id,
    slug: m.slug,
    name: m.name,
    subtitle: [m.courseId ? courseTitle.get(m.courseId) : null, m.lessonId && lessonNumber.get(m.lessonId) ? `Lesson ${lessonNumber.get(m.lessonId)}` : null].filter(Boolean).join(" · "),
    image: m.imageUrl ?? MOVE_FALLBACK_IMAGE,
    level: levels.get(m.id) ?? null,
    history: history.has(m.id) ? historyLine(history.get(m.id)!, today) : null,
  }));
  const moveById = new Map(moves.map((m) => [m.id, m]));
  const milestones = recentMilestones(
    skillEvents.filter((e) => moveById.has(e.moveId)),
    timeZone,
    MILESTONES_SHOWN
  ).map((e) => ({ ...e, name: moveById.get(e.moveId)!.name, slug: moveById.get(e.moveId)!.slug }));
  const milestone = nextMilestone(levels, aggregatePractice(dogSessions.map((s) => ({ move_id: s.moveId, reps: s.reps }))));
  const milestoneMove = milestone ? moves.find((m) => m.id === milestone.moveId) : null;

  const closest = catalog.courses
    .filter((c) => c.total > c.completed)
    .sort((a, b) => a.total - a.completed - (b.total - b.completed))[0];
  const achievements = buildAchievements(orderDefs(data.defs), data.earned, {
    completedLessons: data.completedLessons,
    practiceSessions: data.sessions.length,
    longestRhythm: longestStreak(data.sessions.map((s) => s.practicedOn)),
    feedbackVideos: data.feedbackVideos,
    routines: data.routines,
    lessonsLeftInClosestCourse: closest ? { title: closest.title, left: closest.total - closest.completed } : null,
  });

  return (
    <>
      <TimeZoneSync />
      <DogHeader dog={dog} since={since} stats={{ lessons: data.completedLessons, sessions: dogSessions.length, ready: movesReady(levels) }} />
      <div className="grid-main">
        <MovesCard rows={rows} total={moves.length} />
        <div className="stack-lg sticky">
          {milestone && milestoneMove ? (
            <MilestoneCard name={milestoneMove.name} slug={milestoneMove.slug} sessions={milestone.sessions} averageReps={milestone.averageReps} />
          ) : (
            <NoMilestoneCard />
          )}
          <RecentMilestonesCard rows={milestones} todayIso={today} />
          {viewer.dogs.length > 1 && <MultiDogTip names={viewer.dogs.map((d) => d.name)} />}
        </div>
      </div>
      <PathSection courses={catalog.courses.filter((c) => c.total > 0)} />
      <AchievementsSection items={achievements} />
    </>
  );
}
