import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/admin";
import { CourseForm } from "@/app/admin/courses/new/page";
import { updateCourse, deleteCourse } from "@/app/admin/actions";
import { buildOutline } from "@/lib/course-outline";
import { CourseOutlineEditor } from "./outline/CourseOutlineEditor";
import { CourseImageUpload } from "./CourseImageUpload";
import { requireStaff } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function EditCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  await requireStaff("content");
  const { id } = await params;
  const { saved, error } = await searchParams;
  const sb = createServiceClient();
  const { data: course } = await sb.from("courses").select("*").eq("id", id).single();
  if (!course) notFound();

  const [modulesRes, lessonsRes] = await Promise.all([
    sb.from("modules").select("id, parent_id, title, position, published").eq("course_id", id),
    sb
      .from("lessons")
      .select("id, module_id, title, position, published, kind, free_preview, available_after_days")
      .eq("course_id", id),
  ]);
  if (modulesRes.error || lessonsRes.error) {
    console.error("course outline load failed", {
      id,
      error: modulesRes.error?.message ?? lessonsRes.error?.message,
    });
  }
  const outline = buildOutline(modulesRes.data ?? [], lessonsRes.data ?? []);

  return (
    <div className="space-y-10">
      <Link href="/admin" className="text-sm font-bold text-orange-700 inline-block">
        ← Courses
      </Link>

      <header>
        <h1 className="text-3xl font-extrabold tracking-tighter">{course.title}</h1>
        <p className="text-sm text-slate-500 mt-1">/{course.id}</p>
      </header>

      {saved && (
        <p role="status" className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-sm">
          Course details saved.
        </p>
      )}
      {error && (
        <p role="alert" className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </p>
      )}

      <CourseImageUpload courseId={id} currentUrl={course.image || null} currentAlt={course.image_alt || null} />

      {/* Course details */}
      <section className="bg-white rounded-xl p-1 shadow-sm">
        <details open={Boolean(error)}>
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

      {/* Outline */}
      <section className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold tracking-tighter">Course outline</h2>
          <span className="flex items-center gap-4">
            <Link href={`/admin/courses/${id}/import`} className="text-xs font-bold text-orange-700">
              Import from spreadsheet
            </Link>
            <Link href={`/learn/${id}`} className="text-xs font-bold text-orange-700" target="_blank">
              Preview as student ↗
            </Link>
          </span>
        </div>
        <CourseOutlineEditor courseId={id} outline={outline} />
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
