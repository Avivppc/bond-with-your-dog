import Link from "next/link";
import { Ms, StateCard, StateIc } from "@/components/app/ui";
import type { CatalogCourseView } from "@/lib/practice/server/catalog";
import type { CatalogLesson } from "@/lib/practice/catalog";

/** Every lesson the member can open, grouped by course; lessons with practice steps start a session. */
export function LessonPicker({ courses, lessons, note }: { courses: readonly CatalogCourseView[]; lessons: readonly CatalogLesson[]; note?: string }) {
  const open = lessons.filter((l) => l.accessible);
  if (open.length === 0) {
    return (
      <StateCard
        icon="school"
        eyebrow="Practice"
        title="No lessons are open for you yet"
        action={
          <Link className="btn btn-primary" href="/my-courses">
            Go to My Courses
          </Link>
        }
      >
        Practice mode follows your lessons. Once a course is open, pick a lesson here and practice it step by step.
      </StateCard>
    );
  }
  const withSteps = open.filter((l) => l.stepCount > 0).length;
  return (
    <div className="stack-lg">
      <div className="tip warm">
        <Ms name="tips_and_updates" />
        <div>
          {note ? <b style={{ display: "block" }}>{note}</b> : null}
          {withSteps === 0
            ? "None of your open lessons has practice steps yet. Roni adds them lesson by lesson, and they'll appear here as soon as they're ready. Meanwhile, watch a lesson and practice along with the video."
            : "Pick a lesson to practice. Roni adds practice steps lesson by lesson; lessons without them yet open in the lesson player."}
        </div>
      </div>
      {courses.map((course) => {
        const rows = open.filter((l) => l.courseId === course.id);
        if (rows.length === 0) return null;
        return (
          <div key={course.id} className="card">
            <span className="eyebrow muted">{course.title}</span>
            <div className="list">
              {rows.map((l) => {
                const href = l.stepCount > 0 ? `/practice?lesson=${l.id}` : `/learn/${l.courseId}/${l.id}`;
                return (
                  <Link key={l.id} className="list-row" href={href}>
                    <StateIc mark={l.completed ? "done" : l.stepCount > 0 ? "next" : "open"} small />
                    <div className="grow">
                      <div className="title">
                        {l.number}. {l.title}
                      </div>
                      <div className="faint">{l.stepCount > 0 ? `${l.stepCount} practice ${l.stepCount === 1 ? "step" : "steps"}` : "No practice steps yet · watch the lesson"}</div>
                    </div>
                    <Ms name={l.stepCount > 0 ? "pets" : "play_circle"} />
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
