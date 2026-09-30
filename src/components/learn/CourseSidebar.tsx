import Link from "next/link";
import type { CourseOutline } from "@/lib/course-outline";
import type { CourseProgress } from "@/lib/course-progress";
import type { LessonState } from "@/lib/lesson-state";
import { formatUnlockDate } from "@/lib/drip";
import type { StudentLesson } from "@/lib/student-course-server";

/** Student portal palette (the original Bonded portal design). */
export const LEARN = {
  teal: "#0e666a",
  page: "#edf8ff",
  panel: "#dbebf4",
  panelHead: "#d4e5ef",
  ink: "#243036",
  muted: "#515d64",
  orange: "#ff8f00",
  brown: "#8b4b00",
} as const;

export function ProgressBar({ percent, onDark = false }: { percent: number; onDark?: boolean }) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full ${onDark ? "bg-white/20" : "bg-[#d4e5ef]"}`} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Course progress">
      <div className={`h-full rounded-full ${onDark ? "bg-white" : "kinetic-gradient"}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

export function ProgressRing({ percent, size = 48 }: { percent: number; size?: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${percent}% complete`}>
      <svg className="-rotate-90" width={size} height={size} viewBox="0 0 44 44" aria-hidden>
        <circle cx="22" cy="22" r={r} stroke="#a2afb6" strokeOpacity="0.3" strokeWidth="4" fill="none" />
        <circle cx="22" cy="22" r={r} stroke={LEARN.teal} strokeWidth="4" fill="none" strokeDasharray={c} strokeDashoffset={c - (percent / 100) * c} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold" style={{ color: LEARN.teal }}>
        {percent}%
      </span>
    </div>
  );
}

const STATE_ICON: Record<LessonState["kind"], string> = {
  open: "play_arrow",
  completed: "check",
  locked: "lock",
  upgrade: "lock",
  scheduled: "schedule",
};

interface RowProps {
  courseId: string;
  lesson: StudentLesson;
  number: number;
  state: LessonState;
  current: boolean;
}

function LessonRow({ courseId, lesson, number, state, current }: RowProps) {
  const done = state.kind === "completed";
  const closed = state.kind === "locked" || state.kind === "scheduled" || state.kind === "upgrade";
  const icon = current ? "play_circle" : lesson.kind === "quiz" && state.kind === "open" ? "quiz" : STATE_ICON[state.kind];
  const label = state.kind === "scheduled" ? `Unlocks ${formatUnlockDate(state.unlockAt)}` : state.kind === "upgrade" ? "Full course" : current ? "Current" : null;

  const body = (
    <>
      <span className="relative shrink-0">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-[0.6rem]"
          style={{ backgroundColor: current ? LEARN.orange : "#cde0ea", color: current ? "#462300" : closed ? "#8a979e" : LEARN.ink }}
        >
          <span className="material-symbols-outlined text-[22px]" aria-hidden>
            {icon}
          </span>
        </span>
        {done && !current && (
          <span className="absolute -bottom-1 -right-1 flex rounded-full p-0.5 text-white ring-2 ring-[#dbebf4]" style={{ backgroundColor: LEARN.teal }} aria-hidden>
            <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              check
            </span>
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold uppercase tracking-wider" style={{ color: current ? LEARN.brown : "#6c7980" }}>
          Lesson {String(number).padStart(2, "0")}
          {label ? ` · ${label}` : ""}
        </span>
        <span
          className={`block truncate font-bold ${done && !current ? "opacity-60" : ""}`}
          style={{ fontFamily: "var(--font-headline)", color: current ? "#462300" : closed ? "#6c7980" : LEARN.ink }}
        >
          {lesson.title}
        </span>
      </span>
    </>
  );

  const base = "flex items-center gap-3.5 border-l-4 px-4 py-3 transition-colors";
  if (state.kind === "upgrade") {
    return (
      <Link href={`/learn/${courseId}#upgrade`} className={`${base} border-transparent hover:bg-[#d4e5ef]`} title="Included in the full course">
        {body}
      </Link>
    );
  }
  if (closed) {
    return (
      <span className={`${base} cursor-not-allowed border-transparent`} title={state.kind === "locked" ? "Get access to unlock" : "Unlocks soon"}>
        {body}
      </span>
    );
  }
  return (
    <Link
      href={`/learn/${courseId}/${lesson.id}`}
      aria-current={current ? "page" : undefined}
      className={`${base} ${current ? "" : "border-transparent hover:bg-[#d4e5ef]"}`}
      style={current ? { backgroundColor: "rgba(255,143,0,0.12)", borderColor: LEARN.brown } : undefined}
    >
      {body}
    </Link>
  );
}

interface PanelProps {
  courseId: string;
  outline: CourseOutline<StudentLesson>;
  lessons: readonly StudentLesson[];
  states: ReadonlyMap<string, LessonState>;
  progress: CourseProgress<StudentLesson>;
  /** The lesson being watched (lesson page) or the next one to watch (course home). */
  focusLessonId?: string;
  currentLessonId?: string;
}

/** "Course progress" card beside the player: ring + every lesson, grouped into collapsible modules. */
export function CourseProgressPanel({ courseId, outline, lessons, states, progress, focusLessonId, currentLessonId }: PanelProps) {
  const numberOf = new Map(lessons.map((l, i) => [l.id, i + 1]));
  const focus = currentLessonId ?? focusLessonId;
  const rows = (list: readonly StudentLesson[]) =>
    list.map((l) => (
      <LessonRow key={l.id} courseId={courseId} lesson={l} number={numberOf.get(l.id) ?? 0} state={states.get(l.id) ?? { kind: "locked" }} current={l.id === currentLessonId} />
    ));
  const hasFocus = (m: CourseOutline<StudentLesson>["modules"][number]) =>
    m.lessons.some((l) => l.id === focus) || m.submodules.some((s) => s.lessons.some((l) => l.id === focus));
  const doneIn = (m: CourseOutline<StudentLesson>["modules"][number]) => {
    const all = [...m.lessons, ...m.submodules.flatMap((s) => s.lessons)];
    return { done: all.filter((l) => states.get(l.id)?.kind === "completed").length, total: all.length };
  };

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[#a2afb6]/20" style={{ backgroundColor: LEARN.panel }}>
      <div className="flex items-center justify-between gap-4 p-6" style={{ backgroundColor: LEARN.panelHead }}>
        <div>
          <h2 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-headline)", color: LEARN.ink }}>
            Course progress
          </h2>
          <p className="text-sm font-bold" style={{ color: LEARN.teal }}>
            {progress.completed} of {progress.total} lessons complete
          </p>
        </div>
        <ProgressRing percent={progress.percent} />
      </div>
      <div className="max-h-[65vh] overflow-y-auto pb-2">
        {outline.modules.map((m, i) => {
          const count = doneIn(m);
          return (
            <details key={m.id} open={hasFocus(m) || (!focus && i === 0)} className="group border-t border-[#a2afb6]/20 first:border-t-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 hover:bg-[#d4e5ef]">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold" style={{ fontFamily: "var(--font-headline)", color: LEARN.ink }}>
                    {m.title}
                  </span>
                  <span className="text-[11px] font-semibold" style={{ color: LEARN.muted }}>
                    {count.done}/{count.total} done
                  </span>
                </span>
                <span className="material-symbols-outlined text-[20px] transition-transform group-open:rotate-180" style={{ color: LEARN.muted }} aria-hidden>
                  expand_more
                </span>
              </summary>
              {rows(m.lessons)}
              {m.submodules.map((s) => (
                <div key={s.id}>
                  <p className="px-5 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: LEARN.teal }}>
                    {s.title}
                  </p>
                  {rows(s.lessons)}
                </div>
              ))}
            </details>
          );
        })}
        {outline.unassigned.length > 0 && <div className="border-t border-[#a2afb6]/20">{rows(outline.unassigned)}</div>}
        {lessons.length === 0 && (
          <p className="px-6 py-8 text-center text-sm" style={{ color: LEARN.muted }}>
            Lessons are being prepared.
          </p>
        )}
      </div>
    </div>
  );
}
