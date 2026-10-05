import { createCourse } from "@/app/admin/actions";
import { requireStaff } from "@/lib/admin";
import { Card, Notice, PageHeader } from "@/app/admin/_components/ui";
import { CourseForm } from "@/app/admin/_components/CourseForm";

export const metadata = { title: "New course" };

export default async function NewCoursePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireStaff("content");
  const { error } = await searchParams;
  return (
    <div className="max-w-2xl">
      <PageHeader title="New course" crumbs={[{ label: "Courses", href: "/admin/courses" }, { label: "New course" }]} />
      {error && (
        <div className="mb-4">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      <Card>
        <CourseForm action={createCourse} submitLabel="Create course" />
      </Card>
      <p className="mt-3 text-xs text-[#6c6a69]">After creating the course you can add modules, lessons and a cover image.</p>
    </div>
  );
}
