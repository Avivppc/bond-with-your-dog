import Link from "next/link";
import { StatusPill } from "./ui";
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
      <table className="w-full text-sm">
        <thead className="border-y border-[#efeeed] text-left text-[#6c6a69]">
          <tr>
            <th className="px-5 py-3 font-medium">Title</th>
            <th className="px-3 py-3 font-medium">Students</th>
            <th className="px-3 py-3 font-medium">Lessons</th>
            <th className="px-3 py-3 font-medium">Created</th>
            <th className="px-3 py-3 font-medium">Status</th>
            <th className="px-5 py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#efeeed]">
          {courses.map((c) => (
            <tr key={c.id} className="hover:bg-[#fafaf9]">
              <td className="px-5 py-3">
                <Link href={`/admin/courses/${c.id}`} className="flex items-center gap-3 font-medium text-[#1a1a19] hover:underline">
                  <CourseThumb src={c.image} />
                  <span className="min-w-0">{c.title}</span>
                </Link>
              </td>
              <td className="px-3 py-3 tabular-nums">{c.stats.activeStudents}</td>
              <td className="px-3 py-3 tabular-nums">{c.stats.lessons}</td>
              <td className="whitespace-nowrap px-3 py-3 text-[#6c6a69]">
                {new Date(c.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </td>
              <td className="px-3 py-3">
                <StatusPill tone={c.published ? "published" : "draft"}>{c.published ? "Published" : "Draft"}</StatusPill>
              </td>
              <td className="px-5 py-3 text-right">
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
