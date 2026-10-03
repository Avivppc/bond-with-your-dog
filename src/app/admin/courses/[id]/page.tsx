import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/admin";
import { canPerform } from "@/lib/staff";
import { updateCourse } from "@/app/admin/actions";
import { buildOutline } from "@/lib/course-outline";
import { BTN_SECONDARY, Card, Notice, StatusPill, Tabs, Breadcrumbs, type TabItem } from "@/app/admin/_components/ui";
import { CourseThumb } from "@/app/admin/_components/CourseTable";
import { CourseForm } from "@/app/admin/_components/CourseForm";
import { CourseOutlineEditor } from "./outline/CourseOutlineEditor";
import { CourseImageUpload } from "./CourseImageUpload";
import { ChapterDetailsCard, type ChapterDefaults } from "./ChapterDetailsCard";
import { CourseOffersTab, CourseSettingsTab, CourseStudentsTab } from "./CourseTabs";

export const metadata = { title: "Course" };

export const dynamic = "force-dynamic";

const TAB_KEYS = ["outline", "details", "offers", "students", "settings"] as const;
type TabKey = (typeof TAB_KEYS)[number];

function asTab(value: string | undefined): TabKey {
  return (TAB_KEYS as readonly string[]).includes(value ?? "") ? (value as TabKey) : "outline";
}

export default async function EditCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; saved?: string; error?: string; deleted?: string }>;
}) {
  const { role } = await requireStaff("content");
  const { id } = await params;
  const { tab: tabParam, saved, error, deleted } = await searchParams;
  const canSell = canPerform(role, "sales");

  const sb = createServiceClient();
  const { data: course } = await sb.from("courses").select("*").eq("id", id).maybeSingle();
  if (!course) notFound();

  const base = `/admin/courses/${id}`;
  const tabs: TabItem[] = [
    { key: "outline", label: "Outline", href: base },
    { key: "details", label: "Details", href: `${base}?tab=details` },
    ...(canSell
      ? [
          { key: "offers", label: "Offers", href: `${base}?tab=offers` },
          { key: "students", label: "Students", href: `${base}?tab=students` },
        ]
      : []),
    { key: "settings", label: "Settings", href: `${base}?tab=settings` },
  ];
  const requested = asTab(tabParam);
  const activeTab = tabs.some((t) => t.key === requested) ? requested : "outline";

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Courses", href: "/admin/courses" }, { label: course.title }]} />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <CourseThumb src={course.image || null} className="h-14 w-24 max-sm:hidden" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:truncate">{course.title}</h1>
                <StatusPill tone={course.published ? "published" : "draft"}>{course.published ? "Published" : "Draft"}</StatusPill>
              </div>
              <div className="mt-3">
                <Tabs items={tabs} active={activeTab} />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/learn/${id}`} target="_blank" className={BTN_SECONDARY}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden>
                visibility
              </span>
              Preview
            </Link>
          </div>
        </div>
      </div>

      {saved && <Notice tone="success">{saved === "created" ? "Course created. Add your first module below." : "Course details saved."}</Notice>}
      {deleted === "lesson" && <Notice tone="success">Lesson deleted.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}

      {activeTab === "outline" && <OutlineTab courseId={id} paywallAfterModuleId={course.paywall_after_module_id ?? null} />}

      {activeTab === "details" && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            <Card title="Course details">
              <CourseForm
                action={async (fd: FormData) => {
                  "use server";
                  fd.set("id", id);
                  await updateCourse(fd);
                }}
                submitLabel="Save"
                defaults={course}
              />
            </Card>
            <ChapterDetailsTab course={course} />
          </div>
          <CourseImageUpload courseId={id} currentUrl={course.image || null} currentAlt={course.image_alt || null} />
        </div>
      )}

      {activeTab === "offers" && <CourseOffersTab courseId={id} />}
      {activeTab === "students" && <CourseStudentsTab courseId={id} />}
      {activeTab === "settings" && <CourseSettingsTab courseId={id} />}
    </div>
  );
}

async function OutlineTab({ courseId, paywallAfterModuleId }: { courseId: string; paywallAfterModuleId: string | null }) {
  const sb = createServiceClient();
  const [modulesRes, lessonsRes] = await Promise.all([
    sb.from("modules").select("id, parent_id, title, description, position, published").eq("course_id", courseId),
    sb.from("lessons").select("id, module_id, title, position, published, kind, free_preview, available_after_days").eq("course_id", courseId),
  ]);
  if (modulesRes.error || lessonsRes.error) {
    console.error("course outline load failed", { courseId, error: modulesRes.error?.message ?? lessonsRes.error?.message });
  }
  const outline = buildOutline(modulesRes.data ?? [], lessonsRes.data ?? []);
  return (
    <Card>
      <CourseOutlineEditor courseId={courseId} outline={outline} paywallAfterModuleId={paywallAfterModuleId} />
    </Card>
  );
}

async function ChapterDetailsTab({ course }: { course: ChapterDefaults }) {
  const { data, error } = await createServiceClient().from("courses").select("id, title").neq("id", course.id).order("title");
  if (error) console.error("[course] course list load failed", { courseId: course.id, error: error.message });
  return <ChapterDetailsCard course={course} otherCourses={data ?? []} />;
}
