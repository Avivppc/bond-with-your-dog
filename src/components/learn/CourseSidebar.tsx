import Link from "next/link";
import type { CourseOutline } from "@/lib/course-outline";
import type { CourseProgress } from "@/lib/course-progress";
import type { LessonState } from "@/lib/lesson-state";
import { formatUnlockDate } from "@/lib/drip";
import type { StudentLesson } from "@/lib/student-course-server";

/** Student portal palette (Bonded's Kajabi theme — see docs/kajabi-research/sources/ui-reference.md). */
export const LEARN = {
  teal: "#0e666a",
  page: "#e6f3fb",
  ink: "#253137",
  muted: "#5b6b73",
  orange: "#ff8f00",
} as const;

interface CourseSidebarProps {
  courseId: string;
  courseTitle: string;
  outline: CourseOutline<StudentLesson>;
  states: ReadonlyMap<string, LessonState>;
  progress: CourseProgress<StudentLesson>;
  currentLessonId?: string;
  /** "Now learning" above the progress bar on lesson pages, the brand on the course home. */
  variant: "home" | "lesson";
}

const STATE_ICON: Record<LessonState["kind"], string> = {
  open: "play_circle",
  completed: "check_circle",
  locked: "lock",
  scheduled: "schedule",
};

function LessonLink({ courseId, lesson, state, current }: { courseId: string; lesson: StudentLesson; state: LessonState; current: boolean }) {
  const icon = lesson.kind === "quiz" && state.kind === "open" ? "quiz" : STATE_ICON[state.kind];
  const body = (
    <>
      <span
        className="material-symbols-outlined shrink-0 text-[18px]"
        style={state.kind === "completed" ? { fontVariationSettings: "'FILL' 1" } : undefined}
        aria-hidden
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
      {state.kind === "scheduled" && <span className="shrink-0 text-[10px] opacity-80">{formatUnlockDate(state.unlockAt)}</span>}
    </>
  );
  const base = "flex items-center gap-2.5 rounded-[12px] px-3 py-2 text-[12.5px]";
  if (state.kind === "locked" || state.kind === "scheduled") {
    return (
      <span className={`${base} cursor-not-allowed text-white/45`} title={state.kind === "locked" ? "Get access to unlock" : "Unlocks soon"}>
        {body}
      </span>
    );
  }
  return (
    <Link
      href={`/learn/${courseId}/${lesson.id}`}
      aria-current={current ? "page" : undefined}
      className={`${base} ${current ? "bg-white font-bold" : "text-white/75 hover:bg-white/10 hover:text-white"}`}
      style={current ? { color: LEARN.teal } : undefined}
    >
      {body}
    </Link>
  );
}

/** The lesson list grouped by module — shared by the desktop sidebar and the mobile drawer. */
export function CourseJourney({ courseId, outline, states, currentLessonId }: Pick<CourseSidebarProps, "courseId" | "outline" | "states" | "currentLessonId">) {
  const renderLessons = (lessons: readonly StudentLesson[]) => (
    <ul className="space-y-0.5">
      {lessons.map((l) => (
        <li key={l.id}>
          <LessonLink courseId={courseId} lesson={l} state={states.get(l.id) ?? { kind: "locked" }} current={l.id === currentLessonId} />
        </li>
      ))}
    </ul>
  );
  return (
    <div className="space-y-5">
      {outline.modules.map((m) => (
        <section key={m.id}>
          <h3 className="mb-1 px-3 text-[13px] font-bold text-white" style={{ fontFamily: "var(--font-headline)" }}>
            {m.title}
          </h3>
          {renderLessons(m.lessons)}
          {m.submodules.map((s) => (
            <div key={s.id} className="mt-2">
              <h4 className="mb-1 px-3 text-[12px] font-semibold text-white/85">{s.title}</h4>
              {renderLessons(s.lessons)}
            </div>
          ))}
        </section>
      ))}
      {outline.unassigned.length > 0 && renderLessons(outline.unassigned)}
      {outline.modules.length === 0 && outline.unassigned.length === 0 && <p className="px-3 text-xs text-white/70">Lessons are being prepared.</p>}
    </div>
  );
}

export function ProgressBar({ percent, onDark = false }: { percent: number; onDark?: boolean }) {
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full ${onDark ? "bg-white/20" : "bg-[#d4e5ef]"}`} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Course progress">
      <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: LEARN.orange }} />
    </div>
  );
}

export function CourseSidebar({ courseId, courseTitle, outline, states, progress, currentLessonId, variant }: CourseSidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col overflow-y-auto text-white lg:flex" style={{ backgroundColor: LEARN.teal }}>
      <div className="space-y-4 px-5 pb-5 pt-6">
        {variant === "home" && (
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full text-lg font-extrabold text-white" style={{ backgroundColor: LEARN.orange }}>
              B
            </span>
            <div className="min-w-0">
              <p className="font-extrabold leading-tight" style={{ fontFamily: "var(--font-headline)" }}>
                Bonded
              </p>
              <p className="truncate text-xs text-white/75">{courseTitle}</p>
            </div>
          </div>
        )}
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-white/80 hover:text-white">
          <span className="material-symbols-outlined text-[16px]" aria-hidden>
            chevron_left
          </span>
          All courses
        </Link>
        {variant === "lesson" && (
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">Now learning</p>
            <Link href={`/learn/${courseId}`} className="mt-1 block text-xl font-extrabold leading-tight hover:underline" style={{ fontFamily: "var(--font-headline)" }}>
              {courseTitle}
            </Link>
          </div>
        )}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-white/80">
            <span>Course progress</span>
            <span className="font-bold text-white">{progress.percent}%</span>
          </div>
          <ProgressBar percent={progress.percent} onDark />
        </div>
      </div>
      <div className="border-t border-white/15 px-2 pb-8 pt-4">
        <p className="mb-3 px-3 text-[11px] font-bold uppercase tracking-wider text-white/70">Course journey</p>
        <CourseJourney courseId={courseId} outline={outline} states={states} currentLessonId={currentLessonId} />
      </div>
    </aside>
  );
}
