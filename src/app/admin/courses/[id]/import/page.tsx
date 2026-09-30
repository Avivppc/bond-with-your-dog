import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { ImportForm } from "./ImportForm";

export const dynamic = "force-dynamic";
// The import action runs on this route: big pastes create hundreds of rows and fetch Vimeo metadata.
export const maxDuration = 60;

export default async function ImportOutlinePage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("content");
  const { id } = await params;
  const { data: course } = await createServiceClient().from("courses").select("id, title").eq("id", id).maybeSingle();
  if (!course) notFound();

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href={`/admin/courses/${id}`} className="text-sm font-bold text-orange-700 inline-block">
        ← {course.title}
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tighter">Import lessons from a spreadsheet</h1>
      <ImportForm courseId={id} />
    </div>
  );
}
