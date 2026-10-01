import Link from "next/link";
import { Ms, Ring, StateIc, formatMinutes, type LessonMark } from "@/components/app/ui";
import type { StudentCourse } from "@/lib/student-course-server";

/** Lessons shown on each side of the current one when the rail is under the lesson (phones). */
const NEARBY_LESSONS = 2;

function markFor(kind: string, current: boolean): LessonMark {
  if (current) return "next";
  if (kind === "completed") return "done";
  if (kind === "open") return "open";
  return "lock";
}

/** Right rail on the lesson page: course ring + every lesson, and the "Practice this now" card. */
export function LessonAside({ data, lessonId, hasSteps, checkpointHref }: { data: StudentCourse; lessonId: string; hasSteps: boolean; checkpointHref: string | null }) {
  const { course, lessons, progress, states } = data;
  const currentIndex = lessons.findIndex((l) => l.id === lessonId);
  // On a phone the rail sits under the lesson: only the lessons around this one, then "See all".
  const far = (i: number) => Math.abs(i - currentIndex) > NEARBY_LESSONS;
  return (
    <div className="stack-lg sticky">
      <div className="card tight">
        <div className="row">
          <Ring percent={progress.percent} size={56} />
          <div>
            <b>{course.title}</b>
            <div className="faint">
              {progress.completed} of {progress.total} lessons complete
            </div>
          </div>
        </div>
        <div className="list mini-lessons">
          {lessons.map((l, i) => {
            const state = states.get(l.id)?.kind ?? "locked";
            const current = l.id === lessonId;
            const open = state === "open" || state === "completed";
            const inner = (
              <>
                <StateIc mark={markFor(state, current)} small />
                <span className="grow">
                  {i + 1}. {l.title}
                </span>
                <span className="faint">{formatMinutes(l.duration_seconds) ?? ""}</span>
              </>
            );
            return open ? (
              <Link key={l.id} className={`list-row ${current ? "current" : ""} ${far(i) ? "far" : ""}`} href={`/learn/${course.id}/${l.id}`} aria-current={current ? "page" : undefined}>
                {inner}
              </Link>
            ) : (
              <div key={l.id} className={`list-row ${far(i) ? "far" : ""}`} style={{ opacity: 0.5 }}>
                {inner}
              </div>
            );
          })}
        </div>
        <Link className="link narrow-only" href={`/learn/${course.id}`}>
          See all {lessons.length} lessons
          <Ms name="arrow_forward" />
        </Link>
      </div>
      <div className="card tight" style={{ background: "var(--orange-soft)", boxShadow: "none" }} data-tour="practice-now">
        <b>Practice this now</b>
        <p className="faint" style={{ color: "#5f3500" }}>
          {hasSteps ? "Short guided steps with a timer and a rep counter." : "Log a short session with your dog while it's fresh."}
        </p>
        <Link className="btn btn-primary" href={`/practice?lesson=${lessonId}`}>
          <Ms name="pets" />
          Start practice
        </Link>
        {checkpointHref && (
          <Link className="link" href={checkpointHref} style={{ color: "var(--cognac)" }}>
            Take the checkpoint
            <Ms name="arrow_forward" />
          </Link>
        )}
      </div>
    </div>
  );
}
