import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { BTN_PRIMARY, Card, EmptyState, INPUT, PageHeader } from "../_components/ui";
import { CourseTable } from "../_components/CourseTable";
import { loadAdminCourses } from "../_components/course-stats";

export const dynamic = "force-dynamic";

export default async function AdminCoursesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff("content");
  const { q } = await searchParams;
  const needle = q?.trim().toLowerCase() ?? "";
  const all = await loadAdminCourses();
  const courses = needle ? all.filter((c) => c.title.toLowerCase().includes(needle)) : all;

  return (
    <div>
      <PageHeader
        title="Courses"
        actions={
          <Link href="/admin/courses/new" className={BTN_PRIMARY}>
            <span aria-hidden>+</span> New course
          </Link>
        }
      />
      <Card flush>
        <form className="-mt-1 px-5 pb-1 pt-4">
          <label className="relative block max-w-sm">
            <span className="sr-only">Search courses</span>
            <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[#9b9997]" aria-hidden>
              search
            </span>
            <input name="q" defaultValue={q ?? ""} placeholder="Search…" className={`${INPUT} pl-9`} />
          </label>
        </form>
        {courses.length === 0 ? (
          <EmptyState title={needle ? "No courses match your search." : "No courses yet."}>
            {!needle && "Create your first course to start adding modules and lessons."}
          </EmptyState>
        ) : (
          <CourseTable courses={courses} />
        )}
        <p className="border-t border-[#efeeed] px-5 py-3 text-xs text-[#6c6a69]">
          Showing <b className="text-[#1a1a19]">{courses.length}</b> of <b className="text-[#1a1a19]">{all.length}</b> courses
        </p>
      </Card>
    </div>
  );
}
