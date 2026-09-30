import Link from "next/link";
import { computeUnlockAt, isLockedNow, formatUnlockDate } from "@/lib/drip";
import type { OutlineLessonRow } from "@/lib/course-outline";

export interface MemberLessonRow extends OutlineLessonRow {
  duration_seconds: number | null;
}

interface CourseLessonRowProps {
  courseId: string;
  lesson: MemberLessonRow;
  number: number;
  enrolledAt: string | null;
  completed: boolean;
}

function QuizBadge() {
  return (
    <span
      className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
      style={{ backgroundColor: "#f3e8ff", color: "#6b21a8" }}
    >
      Quiz
    </span>
  );
}

/** One lesson in the student course outline: locked (enrollment/drip) or a link to play it. */
export function CourseLessonRow({ courseId, lesson, number, enrolledAt, completed }: CourseLessonRowProps) {
  const unlockAt = computeUnlockAt(enrolledAt ?? undefined, lesson.available_after_days);
  const drippedLocked = enrolledAt ? isLockedNow(unlockAt) : false;
  const enrollLocked = !enrolledAt && !lesson.free_preview;

  if (drippedLocked || enrollLocked) {
    return (
      <div className="px-6 py-4 flex items-center justify-between opacity-70">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined" style={{ color: "#a2afb6" }}>
            {drippedLocked ? "schedule" : "lock"}
          </span>
          <div>
            <p className="font-bold flex items-center gap-2" style={{ color: "#243036" }}>
              {number}. {lesson.title}
              {lesson.kind === "quiz" && <QuizBadge />}
            </p>
            {drippedLocked && unlockAt && (
              <p className="text-xs" style={{ color: "#515d64" }}>
                Unlocks {formatUnlockDate(unlockAt)}
              </p>
            )}
          </div>
        </div>
        <span className="text-xs font-bold uppercase" style={{ color: "#a2afb6" }}>
          {drippedLocked ? "Scheduled" : "Locked"}
        </span>
      </div>
    );
  }

  return (
    <Link
      href={`/learn/${courseId}/${lesson.id}`}
      className="px-6 py-4 flex items-center justify-between hover:bg-slate-50"
    >
      <div className="flex items-center gap-4">
        <span className="material-symbols-outlined" style={{ color: completed ? "#0e666a" : "#8b4b00" }}>
          {completed ? "check_circle" : lesson.kind === "quiz" ? "quiz" : "play_circle"}
        </span>
        <div>
          <p className="font-bold flex items-center gap-2" style={{ color: "#243036" }}>
            {number}. {lesson.title}
            {lesson.kind === "quiz" && <QuizBadge />}
          </p>
          {lesson.duration_seconds ? (
            <p className="text-xs" style={{ color: "#515d64" }}>
              {Math.round(lesson.duration_seconds / 60)} min
            </p>
          ) : null}
        </div>
      </div>
      {lesson.free_preview && !enrolledAt && (
        <span
          className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
          style={{ backgroundColor: "#a6eff3", color: "#005b5f" }}
        >
          Free preview
        </span>
      )}
    </Link>
  );
}
