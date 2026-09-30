import Link from "next/link";
import { formatUnlockDate } from "@/lib/drip";
import type { LessonState } from "@/lib/lesson-state";
import type { StudentLesson } from "@/lib/student-course-server";
import { LEARN } from "@/components/learn/CourseSidebar";

interface CourseLessonRowProps {
  courseId: string;
  lesson: StudentLesson;
  number: number;
  state: LessonState;
  /** Show the "Free preview" tag (only useful to people without access). */
  showPreviewTag: boolean;
}

const ICON: Record<LessonState["kind"], string> = { open: "play_circle", completed: "check_circle", locked: "lock", upgrade: "lock", scheduled: "schedule" };

function minutes(seconds: number | null): string | null {
  return seconds ? `${Math.max(1, Math.round(seconds / 60))} min` : null;
}

/** One lesson in the course map: a link when it can be opened, otherwise a locked/scheduled row. */
export function CourseLessonRow({ courseId, lesson, number, state, showPreviewTag }: CourseLessonRowProps) {
  const openable = state.kind === "open" || state.kind === "completed";
  const meta =
    state.kind === "scheduled"
      ? `Unlocks ${formatUnlockDate(state.unlockAt)}`
      : state.kind === "locked"
        ? "Locked"
        : state.kind === "upgrade"
          ? "Included in the full course"
        : [lesson.kind === "quiz" ? "Quiz" : null, minutes(lesson.duration_seconds)].filter(Boolean).join(" · ");
  const content = (
    <>
      <span
        className="material-symbols-outlined text-[22px]"
        style={{ color: state.kind === "completed" ? LEARN.teal : openable ? LEARN.orange : "#a2afb6", fontVariationSettings: state.kind === "completed" ? "'FILL' 1" : undefined }}
        aria-hidden
      >
        {lesson.kind === "quiz" && state.kind === "open" ? "quiz" : ICON[state.kind]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">
          {number}. {lesson.title}
        </span>
        {meta && (
          <span className="block text-xs" style={{ color: LEARN.muted }}>
            {meta}
          </span>
        )}
      </span>
      {showPreviewTag && lesson.free_preview && (
        <span className="shrink-0 rounded-full bg-[#a6eff3] px-2.5 py-0.5 text-[11px] font-bold text-[#005b5f]">Free preview</span>
      )}
    </>
  );
  return openable ? (
    <Link href={`/learn/${courseId}/${lesson.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[#f3f9fd]">
      {content}
    </Link>
  ) : (
    <div className="flex items-center gap-3 px-5 py-3.5 opacity-70">{content}</div>
  );
}
