import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { canPerform } from "@/lib/staff";
import { StatsOverview } from "./_components/StatsOverview";
import { BTN_PRIMARY, BTN_SECONDARY, Card, EmptyState, PageHeader } from "./_components/ui";
import { CourseTable } from "./_components/CourseTable";
import { loadAdminCourses } from "./_components/course-stats";

export const dynamic = "force-dynamic";

const RECENT_COURSES = 5;

export default async function AdminDashboardPage() {
  const { user, role } = await requireStaff("content");
  const courses = await loadAdminCourses(RECENT_COURSES);
  const canSell = canPerform(role, "sales");
  const name = user.email?.split("@")[0] ?? "there";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${name}`}
        description="Here's what's happening in your academy."
        actions={
          <>
            {canSell && (
              <Link href="/admin/students" className={BTN_SECONDARY}>
                Grant access
              </Link>
            )}
            <Link href="/admin/courses/new" className={BTN_PRIMARY}>
              <span aria-hidden>+</span> New course
            </Link>
          </>
        }
      />
      {canSell && <StatsOverview />}
      <Card
        flush
        title="Courses"
        actions={
          <Link href="/admin/courses" className="text-sm font-medium text-[#1a1a19] hover:underline">
            View all
          </Link>
        }
      >
        {courses.length === 0 ? <EmptyState title="No courses yet." /> : <CourseTable courses={courses} />}
      </Card>
    </div>
  );
}
