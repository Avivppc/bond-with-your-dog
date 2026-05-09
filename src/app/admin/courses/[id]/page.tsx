import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/admin";
import { CourseForm } from "@/app/admin/courses/new/page";
import { updateCourse, deleteCourse } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sb = createServiceClient();
  const { data: course } = await sb.from("courses").select("*").eq("id", id).single();
  if (!course) notFound();

  const { data: lessons } = await sb
    .from("lessons")
    .select("id, position, title, kind, mux_playback_id, available_after_days, free_preview")
    .eq("course_id", id)
    .order("position", { ascending: true });

  return (
    <div className="space-y-10">
      <Link href="/admin" className="text-sm font-bold text-orange-700 inline-block">
        ← Courses
      </Link>

      <header>
        <h1 className="text-3xl font-extrabold tracking-tighter">{course.title}</h1>
        <p className="text-sm text-slate-500 mt-1">/{course.id}</p>
      </header>

      {/* Course details */}
      <section className="bg-white rounded-xl p-1 shadow-sm">
        <details>
          <summary className="cursor-pointer px-6 py-4 font-bold text-slate-700">
            Course details
          </summary>
          <div className="p-6 pt-0">
            <CourseForm
              action={async (fd: FormData) => {
                "use server";
                fd.set("id", id);
                await updateCourse(fd);
              }}
              submitLabel="Save changes"
              defaults={course}
            />
          </div>
        </details>
      </section>

      {/* Lessons */}
      <section className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold tracking-tighter">Lessons</h2>
          <Link
            href={`/admin/courses/${id}/lessons/new`}
            className="bg-orange-700 text-white px-4 py-2 rounded-full font-bold text-xs"
          >
            + New lesson
          </Link>
        </div>
        {!lessons || lessons.length === 0 ? (
          <p className="text-slate-500 text-sm py-6">No lessons yet.</p>
        ) : (
          <ol className="divide-y divide-slate-100">
            {lessons.map((l) => (
              <li
                key={l.id}
                className="py-3 flex items-center justify-between gap-4 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-bold text-slate-400 w-8 shrink-0">{l.position}.</span>
                  <span className="font-bold text-slate-800 truncate">{l.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                      l.kind === "quiz"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {l.kind}
                  </span>
                  {l.kind === "video" && !l.mux_playback_id && (
                    <span className="text-[10px] font-bold uppercase text-amber-700 shrink-0">
                      no video
                    </span>
                  )}
                  {l.available_after_days != null && (
                    <span className="text-[10px] font-bold uppercase text-slate-500 shrink-0">
                      drips after {l.available_after_days}d
                    </span>
                  )}
                  {l.free_preview && (
                    <span className="text-[10px] font-bold uppercase text-emerald-700 shrink-0">
                      free preview
                    </span>
                  )}
                </div>
                <Link
                  href={`/admin/courses/${id}/lessons/${l.id}`}
                  className="text-orange-700 font-bold shrink-0"
                >
                  Edit →
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="bg-white rounded-xl p-6 shadow-sm border border-red-100">
        <h2 className="font-bold text-red-700 mb-3">Danger zone</h2>
        <form action={deleteCourse}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            className="bg-red-600 text-white px-4 py-2 rounded-full font-bold text-xs"
          >
            Delete course
          </button>
        </form>
      </section>
    </div>
  );
}
