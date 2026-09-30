import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { buildOutline, flattenLessons } from "@/lib/course-outline";
import { CourseLessonRow, type MemberLessonRow } from "./CourseLessonRow";

export const dynamic = "force-dynamic";

export default async function CourseLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ enroll?: string }>;
}) {
  const { courseId } = await params;
  const enrollFailed = (await searchParams).enroll === "failed";
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/learn/${courseId}`);

  const { data: course } = await supabase
    .from("courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (!course) notFound();

  // RLS returns only live modules/lessons to students (staff also see drafts).
  const [modulesRes, lessonsRes] = await Promise.all([
    supabase.from("modules").select("id, parent_id, title, position, published").eq("course_id", courseId),
    supabase
      .from("lessons")
      .select("id, module_id, position, title, published, kind, duration_seconds, free_preview, available_after_days")
      .eq("course_id", courseId),
  ]);
  if (modulesRes.error || lessonsRes.error) {
    console.error("course outline load failed", {
      courseId,
      error: modulesRes.error?.message ?? lessonsRes.error?.message,
    });
  }
  const outline = buildOutline<MemberLessonRow>(modulesRes.data ?? [], lessonsRes.data ?? []);
  const lessonNumber = new Map(flattenLessons(outline).map((l, i) => [l.id, i + 1]));

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("course_id, enrolled_at")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: progress } = await supabase
    .from("lesson_progress")
    .select("lesson_id, completed_at")
    .eq("user_id", user.id);

  const completed = new Set(
    (progress ?? []).filter((p) => p.completed_at).map((p) => p.lesson_id)
  );

  const renderLessons = (items: readonly MemberLessonRow[]) =>
    items.length > 0 ? (
      <ol className="divide-y divide-slate-100">
        {items.map((l) => (
          <li key={l.id}>
            <CourseLessonRow
              courseId={courseId}
              lesson={l}
              number={lessonNumber.get(l.id) ?? 0}
              enrolledAt={enrollment?.enrolled_at ?? null}
              completed={completed.has(l.id)}
            />
          </li>
        ))}
      </ol>
    ) : null;

  return (
    <>
      <Navbar />
      <main
        className="pt-28 pb-20 max-w-5xl mx-auto px-5 md:px-8 min-h-screen"
        style={{ backgroundColor: "#edf8ff" }}
      >
        <Link
          href="/dashboard"
          className="text-sm font-bold mb-6 inline-block"
          style={{ color: "#8b4b00" }}
        >
          ← Back to dashboard
        </Link>

        <header className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#8b4b00" }}>
            {course.category} · {course.level}
          </p>
          <h1
            className="text-4xl md:text-5xl font-extrabold tracking-tighter mb-3"
            style={{ fontFamily: "var(--font-headline)", color: "#243036" }}
          >
            {course.title}
          </h1>
          <p className="text-lg max-w-2xl" style={{ color: "#515d64" }}>
            {course.description}
          </p>
        </header>

        {!enrollment && Number(course.price) > 0 && (
          <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm">
            <p className="font-bold" style={{ color: "#243036" }}>
              You&apos;re not enrolled yet
            </p>
            <p className="text-sm" style={{ color: "#515d64" }}>
              Enrollment for this course opens soon. Free preview lessons are available below.
            </p>
          </div>
        )}

        {!enrollment && Number(course.price) === 0 && (
          <div className="bg-white rounded-2xl p-6 mb-8 flex items-center justify-between shadow-sm">
            <div>
              <p className="font-bold" style={{ color: "#243036" }}>
                You&apos;re not enrolled yet
              </p>
              <p className="text-sm" style={{ color: "#515d64" }}>
                Enroll to unlock all lessons.
              </p>
              {enrollFailed && (
                <p role="alert" className="text-sm font-bold mt-1" style={{ color: "#b91c1c" }}>
                  We couldn&apos;t enroll you just now. Please try again.
                </p>
              )}
            </div>
            <form
              action={async () => {
                "use server";
                const supabase = await createClient();
                // enroll_free() only admits published courses priced 0 (see phase0 migration).
                const { error } = await supabase.rpc("enroll_free", { p_course_id: courseId });
                if (error) {
                  console.error("enroll_free failed", { courseId, error: error.message });
                  redirect(`/learn/${courseId}?enroll=failed`);
                }
                redirect(`/learn/${courseId}`);
              }}
            >
              <button
                type="submit"
                className="kinetic-gradient px-5 py-2.5 rounded-full font-bold text-sm shadow-md"
                style={{ color: "#fff0e6" }}
              >
                Enroll for free
              </button>
            </form>
          </div>
        )}

        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2
              className="text-xl font-extrabold"
              style={{ fontFamily: "var(--font-headline)", color: "#243036" }}
            >
              Lessons
            </h2>
          </div>
          {lessonNumber.size === 0 ? (
            <div className="p-10 text-center text-sm" style={{ color: "#515d64" }}>
              Lessons are being prepared. Check back soon.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {outline.modules.map((m) => (
                <div key={m.id}>
                  <h3
                    className="px-6 pt-5 pb-2 text-sm font-extrabold uppercase tracking-wider"
                    style={{ color: "#8b4b00" }}
                  >
                    {m.title}
                  </h3>
                  {renderLessons(m.lessons)}
                  {m.submodules.map((sub) => (
                    <div key={sub.id} className="ms-6 border-s-2 border-slate-100">
                      <h4 className="px-6 pt-3 pb-1 text-sm font-bold" style={{ color: "#243036" }}>
                        {sub.title}
                      </h4>
                      {renderLessons(sub.lessons)}
                    </div>
                  ))}
                </div>
              ))}
              {renderLessons(outline.unassigned)}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
