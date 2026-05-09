import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/admin";
import { createLesson } from "../actions";
import { LessonForm } from "../[lid]/LessonForm";

export default async function NewLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const sb = createServiceClient();
  const { count } = await sb
    .from("lessons")
    .select("id", { count: "exact", head: true })
    .eq("course_id", id);
  const nextPosition = (count ?? 0) + 1;

  return (
    <div className="max-w-2xl">
      <Link
        href={`/admin/courses/${id}`}
        className="text-sm font-bold text-orange-700 mb-4 inline-block"
      >
        ← Course
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tighter mb-8">New lesson</h1>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {decodeURIComponent(error)}
        </div>
      )}
      <LessonForm
        action={createLesson}
        submitLabel="Create lesson"
        defaults={{ course_id: id, position: nextPosition, kind: "video", pass_threshold: 70 }}
      />
    </div>
  );
}
