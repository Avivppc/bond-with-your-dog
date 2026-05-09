import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { computeUnlockAt, isLockedNow, formatUnlockDate } from "@/lib/drip";

export const dynamic = "force-dynamic";

export default async function CourseLandingPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
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

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, position, title, kind, duration_seconds, free_preview, available_after_days")
    .eq("course_id", courseId)
    .order("position", { ascending: true });

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

        {!enrollment && (
          <div className="bg-white rounded-2xl p-6 mb-8 flex items-center justify-between shadow-sm">
            <div>
              <p className="font-bold" style={{ color: "#243036" }}>
                You&apos;re not enrolled yet
              </p>
              <p className="text-sm" style={{ color: "#515d64" }}>
                Enroll to unlock all lessons.
              </p>
            </div>
            <form
              action={async () => {
                "use server";
                const supabase = await createClient();
                const {
                  data: { user },
                } = await supabase.auth.getUser();
                if (!user) return;
                await supabase
                  .from("enrollments")
                  .insert({ user_id: user.id, course_id: courseId });
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
          {!lessons || lessons.length === 0 ? (
            <div className="p-10 text-center text-sm" style={{ color: "#515d64" }}>
              Lessons are being prepared. Check back soon.
            </div>
          ) : (
            <ol className="divide-y divide-slate-100">
              {lessons.map((l) => {
                const unlockAt = computeUnlockAt(enrollment?.enrolled_at, l.available_after_days);
                const drippedLocked = isLockedNow(unlockAt);
                const enrollLocked = !enrollment && !l.free_preview;
                const locked = drippedLocked || enrollLocked;
                const done = completed.has(l.id);
                return (
                  <li key={l.id}>
                    {locked ? (
                      <div className="px-6 py-4 flex items-center justify-between opacity-70">
                        <div className="flex items-center gap-4">
                          <span className="material-symbols-outlined" style={{ color: "#a2afb6" }}>
                            {drippedLocked ? "schedule" : "lock"}
                          </span>
                          <div>
                            <p className="font-bold flex items-center gap-2" style={{ color: "#243036" }}>
                              {l.position}. {l.title}
                              {l.kind === "quiz" && (
                                <span
                                  className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: "#f3e8ff", color: "#6b21a8" }}
                                >
                                  Quiz
                                </span>
                              )}
                            </p>
                            {drippedLocked && unlockAt && (
                              <p className="text-xs" style={{ color: "#515d64" }}>
                                Unlocks {formatUnlockDate(unlockAt)}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-xs font-bold uppercase" style={{ color: "#a2afb6" }}>
                          {drippedLocked ? "Scheduled" : "Locked"}
                        </span>
                      </div>
                    ) : (
                      <Link
                        href={`/learn/${courseId}/${l.id}`}
                        className="px-6 py-4 flex items-center justify-between hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-4">
                          <span
                            className="material-symbols-outlined"
                            style={{ color: done ? "#0e666a" : "#8b4b00" }}
                          >
                            {done ? "check_circle" : l.kind === "quiz" ? "quiz" : "play_circle"}
                          </span>
                          <div>
                            <p className="font-bold flex items-center gap-2" style={{ color: "#243036" }}>
                              {l.position}. {l.title}
                              {l.kind === "quiz" && (
                                <span
                                  className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: "#f3e8ff", color: "#6b21a8" }}
                                >
                                  Quiz
                                </span>
                              )}
                            </p>
                            {l.duration_seconds ? (
                              <p className="text-xs" style={{ color: "#515d64" }}>
                                {Math.round(l.duration_seconds / 60)} min
                              </p>
                            ) : null}
                          </div>
                        </div>
                        {l.free_preview && !enrollment && (
                          <span
                            className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full"
                            style={{ backgroundColor: "#a6eff3", color: "#005b5f" }}
                          >
                            Free preview
                          </span>
                        )}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
