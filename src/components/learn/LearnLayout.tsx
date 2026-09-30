import Link from "next/link";
import { CourseJourney, CourseSidebar, LEARN, ProgressBar } from "./CourseSidebar";
import type { StudentCourse } from "@/lib/student-course-server";

interface LearnLayoutProps {
  data: StudentCourse;
  currentLessonId?: string;
  variant: "home" | "lesson";
  children: React.ReactNode;
}

/**
 * Student course shell (Kajabi-style): teal course-journey sidebar on desktop; on phones a slim
 * top bar with the same journey in a collapsible panel.
 */
export function LearnLayout({ data, currentLessonId, variant, children }: LearnLayoutProps) {
  const { course, outline, states, progress } = data;
  return (
    <div className="min-h-screen" style={{ backgroundColor: LEARN.page, color: LEARN.ink }}>
      {data.isStaffPreview && (
        <div className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-[#5b3fd6] px-4 py-2 text-xs text-white lg:ml-72">
          <span>
            <b>Preview mode.</b> You&apos;re seeing this course as a team member — all lessons are open to you.
          </span>
          <Link href={`/admin/courses/${course.id}`} className="shrink-0 font-bold underline">
            Back to admin
          </Link>
        </div>
      )}
      <CourseSidebar
        courseId={course.id}
        courseTitle={course.title}
        outline={outline}
        states={states}
        progress={progress}
        currentLessonId={currentLessonId}
        variant={variant}
      />

      <div className="sticky top-0 z-20 text-white lg:hidden" style={{ backgroundColor: LEARN.teal }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/dashboard" aria-label="All courses" className="flex rounded-full p-1 hover:bg-white/10">
            <span className="material-symbols-outlined" aria-hidden>
              chevron_left
            </span>
          </Link>
          <Link href={`/learn/${course.id}`} className="min-w-0 flex-1 truncate font-extrabold" style={{ fontFamily: "var(--font-headline)" }}>
            {course.title}
          </Link>
          <span className="text-xs font-bold">{progress.percent}%</span>
        </div>
        <details className="group border-t border-white/15">
          <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-2 text-xs font-bold uppercase tracking-wider text-white/85">
            Course journey
            <span className="material-symbols-outlined text-[18px] transition-transform group-open:rotate-180" aria-hidden>
              expand_more
            </span>
          </summary>
          <div className="max-h-[60vh] overflow-y-auto px-2 pb-4">
            <div className="px-3 pb-3">
              <ProgressBar percent={progress.percent} onDark />
            </div>
            <CourseJourney courseId={course.id} outline={outline} states={states} currentLessonId={currentLessonId} />
          </div>
        </details>
      </div>

      <main className="lg:pl-72">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-8 sm:py-10">{children}</div>
      </main>
    </div>
  );
}
