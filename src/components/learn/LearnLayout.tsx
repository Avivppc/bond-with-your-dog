import Link from "next/link";
import { CourseProgressPanel, LEARN } from "./CourseSidebar";
import type { StudentCourse } from "@/lib/student-course-server";

interface LearnLayoutProps {
  data: StudentCourse;
  currentLessonId?: string;
  variant: "home" | "lesson";
  children: React.ReactNode;
}

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/courses", label: "Courses", active: true },
  { href: "/community", label: "Community" },
  { href: "/profile", label: "Profile" },
];

/**
 * Student course shell (the original Bonded course-player design): a light top bar, the lesson or
 * course home on the left and the "Course progress" card on the right (below the content on phones).
 */
export function LearnLayout({ data, currentLessonId, variant, children }: LearnLayoutProps) {
  const { course, outline, lessons, states, progress } = data;
  const backHref = variant === "lesson" ? `/learn/${course.id}` : "/dashboard";
  return (
    <div className="min-h-screen" style={{ backgroundColor: LEARN.page, color: LEARN.ink }}>
      <header className="sticky top-0 z-40 bg-white/80 shadow-sm backdrop-blur-xl">
        {data.isStaffPreview && (
          <div className="flex items-center justify-between gap-3 bg-[#5b3fd6] px-4 py-2 text-xs text-white">
            <span>
              <b>Preview mode.</b> You&apos;re seeing this course as a team member — all lessons are open to you.
            </span>
            <Link href={`/admin/courses/${course.id}`} className="shrink-0 font-bold underline">
              Back to admin
            </Link>
          </div>
        )}
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href={backHref} aria-label={variant === "lesson" ? "Course home" : "Dashboard"} className="flex rounded-full p-2 hover:bg-slate-100">
              <span className="material-symbols-outlined" aria-hidden>
                arrow_back
              </span>
            </Link>
            <Link href="/dashboard" className="shrink-0 text-2xl font-black italic tracking-tight" style={{ fontFamily: "var(--font-headline)", color: "#7c3900" }}>
              Bonded
            </Link>
            <span className="hidden truncate text-sm font-semibold sm:block md:hidden" style={{ color: LEARN.muted }}>
              {course.title}
            </span>
          </div>
          <nav className="hidden items-center gap-6 font-bold tracking-tight md:flex" style={{ fontFamily: "var(--font-headline)" }} aria-label="Portal">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={n.active ? "page" : undefined}
                className={n.active ? "border-b-2 pb-0.5" : "text-slate-600 hover:text-orange-600"}
                style={n.active ? { color: "#7c3900", borderColor: LEARN.orange } : undefined}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <span className="text-sm font-bold md:hidden" style={{ color: LEARN.teal }}>
            {progress.percent}%
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 pb-24 pt-6 md:px-8 lg:pt-8">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="min-w-0 flex-1 space-y-8">{children}</div>
          <aside className="w-full shrink-0 lg:w-96">
            <div className="lg:sticky lg:top-24">
              <CourseProgressPanel
                courseId={course.id}
                outline={outline}
                lessons={lessons}
                states={states}
                progress={progress}
                currentLessonId={currentLessonId}
                focusLessonId={progress.next?.id}
              />
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
