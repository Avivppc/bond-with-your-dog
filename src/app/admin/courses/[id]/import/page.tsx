import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { ImportForm } from "./ImportForm";
import { PageHeader } from "@/app/admin/_components/ui";

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
      <PageHeader
        title="Import lessons"
        description="Paste rows from Google Sheets or Excel to create modules and lessons in one go."
        crumbs={[
          { label: "Courses", href: "/admin/courses" },
          { label: course.title, href: `/admin/courses/${id}` },
          { label: "Import" },
        ]}
      />
      <ImportForm courseId={id} />
    </div>
  );
}
