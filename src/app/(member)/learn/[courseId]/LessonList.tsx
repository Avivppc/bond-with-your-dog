import Link from "next/link";
import { StateIc, formatMinutes, type LessonMark } from "@/components/app/ui";
import { LocalTime } from "@/components/ui/LocalTime";
import type { StudentCourse, StudentLesson } from "@/lib/student-course-server";
import type { LessonState } from "@/lib/lesson-state";

function mark(state: LessonState, isNext: boolean): LessonMark {
  if (state.kind === "completed") return "done";
  if (state.kind === "locked" || state.kind === "upgrade" || state.kind === "scheduled") return "lock";
  return isNext ? "next" : "open";
}

function detail(lesson: StudentLesson, state: LessonState, isNext: boolean): React.ReactNode {
  const minutes = formatMinutes(lesson.duration_seconds);
  const parts: React.ReactNode[] = [];
  if (minutes) parts.push(minutes);
  if (lesson.kind === "quiz") parts.push("Checkpoint");
  if (state.kind === "scheduled")
    parts.push(
      <span key="s">
        Opens <LocalTime iso={state.unlockAt.toISOString()} format="shortDate" />
      </span>,
    );
  else if (state.kind === "upgrade") parts.push("In the full chapter");
  else if (isNext) parts.push("Up next");
  return parts.map((p, i) => (
    <span key={i}>
      {i > 0 && " · "}
      {p}
    </span>
  ));
}

function Row({ courseId, lesson, n, state, isNext, locked, fallbackImage }: { courseId: string; lesson: StudentLesson; n: number; state: LessonState; isNext: boolean; locked: boolean; fallbackImage: string }) {
  const closed = locked || state.kind === "locked" || state.kind === "upgrade" || state.kind === "scheduled";
  const body = (
    <>
      <span className="n">{String(n).padStart(2, "0")}</span>
      <span className="th">
        {/* eslint-disable-next-line @next/next/no-img-element -- lesson thumbnail */}
        <img src={lesson.thumbnail_url || fallbackImage} alt="" />
      </span>
      <span>
        <b>{lesson.title}</b>
        <span className="faint" style={{ display: "block" }}>
          {detail(lesson, state, isNext)}
        </span>
      </span>
      <StateIc mark={locked ? "lock" : mark(state, isNext)} />
    </>
  );
  const cls = `lesson-row ${isNext && !closed ? "current" : ""} ${closed ? "locked" : ""}`;
  if (state.kind === "upgrade") {
    return (
      <Link className={cls} href={`/learn/${courseId}#upgrade`}>
        {body}
      </Link>
    );
  }
  if (closed) {
    return (
      <div className={cls} aria-disabled>
        {body}
      </div>
    );
  }
  return (
    <Link className={cls} href={`/learn/${courseId}/${lesson.id}`}>
      {body}
    </Link>
  );
}

/** The course's lessons grouped by module (design: course overview "Lessons" card). */
export function LessonList({ data, locked }: { data: StudentCourse; locked: boolean }) {
  const number = new Map(data.lessons.map((l, i) => [l.id, i + 1]));
  const nextId = data.progress.next?.id ?? null;
  const fallback = data.course.image || "/app/img/hand-touch.jpg";
  const rows = (lessons: readonly StudentLesson[]) =>
    lessons.map((l) => (
      <Row key={l.id} courseId={data.course.id} lesson={l} n={number.get(l.id) ?? 0} state={data.states.get(l.id) ?? { kind: "locked" }} isNext={l.id === nextId} locked={locked} fallbackImage={fallback} />
    ));
  const showHeadings = data.outline.modules.length > 1;
  return (
    <div className="list">
      {data.outline.modules.map((m) => (
        <div key={m.id} className="stack" style={{ gap: 0 }}>
          {showHeadings && (
            <span className="eyebrow muted" style={{ padding: "18px 0 6px" }}>
              {m.title}
            </span>
          )}
          {m.description && (
            <p className="faint" style={{ margin: 0, padding: showHeadings ? "0 0 8px" : "12px 0 8px", whiteSpace: "pre-line" }}>
              {m.description}
            </p>
          )}
          {rows(m.lessons)}
          {m.submodules.map((s) => (
            <div key={s.id} className="stack" style={{ gap: 0 }}>
              <span className="faint" style={{ padding: "12px 0 4px", fontWeight: 600 }}>
                {s.title}
              </span>
              {s.description && (
                <p className="faint" style={{ margin: 0, padding: "0 0 6px", whiteSpace: "pre-line" }}>
                  {s.description}
                </p>
              )}
              {rows(s.lessons)}
            </div>
          ))}
        </div>
      ))}
      {rows(data.outline.unassigned)}
    </div>
  );
}
