import Link from "next/link";
import { StatusPill, TABLE, TD, TH, THEAD, TROW } from "./ui";
import { shortDate } from "./list-kit";
import type { AdminCourseRow } from "./course-stats";

export function CourseThumb({ src, className = "h-10 w-16" }: { src: string | null; className?: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail from our public storage bucket
    <img src={src} alt="" className={`${className} shrink-0 rounded-[6px] border border-[#e7e6e4] object-cover`} />
  ) : (
    <span className={`${className} flex shrink-0 items-center justify-center rounded-[6px] border border-[#e7e6e4] bg-[#f3f3f2] text-[#9b9997]`} aria-hidden>
      <span className="material-symbols-outlined text-[18px]">image</span>
    </span>
  );
}

/** Kajabi-style products table: thumbnail + title, students, lessons, created, status. */
export function CourseTable({ courses }: { courses: readonly AdminCourseRow[] }) {
  return (
    <div className="relative overflow-x-auto">
      <table className={TABLE}>
        <thead className={THEAD}>
          <tr>
            <th className={TH}>Title</th>
            <th className={TH}>Students</th>
            <th className={TH}>Lessons</th>
            <th className={TH}>Created</th>
            <th className={TH}>Status</th>
            <th className={TH}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c.id} className={TROW}>
              <td className={TD}>
                <Link href={`/admin/courses/${c.id}`} className="flex items-center gap-3 font-medium text-[#1a1a19] hover:underline">
                  <CourseThumb src={c.image} />
                  <span className="min-w-0">{c.title}</span>
                </Link>
              </td>
              <td className={`${TD} tabular-nums`}>{c.stats.activeStudents}</td>
              <td className={`${TD} tabular-nums`}>{c.stats.lessons}</td>
              <td className={`${TD} whitespace-nowrap text-[#6c6a69]`}>{shortDate(c.created_at)}</td>
              <td className={TD}>
                <StatusPill tone={c.published ? "published" : "draft"}>{c.published ? "Published" : "Draft"}</StatusPill>
              </td>
              <td className={`${TD} text-right`}>
                <Link href={`/admin/courses/${c.id}`} className="text-sm font-medium text-[#1a1a19] hover:underline">
                  Edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
