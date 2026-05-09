import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LessonPlayer from "./LessonPlayer";
import QuizPlayer from "./QuizPlayer";
import { computeUnlockAt, isLockedNow, formatUnlockDate } from "@/lib/drip";

export const dynamic = "force-dynamic";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/learn/${courseId}/${lessonId}`);

  const { data: lesson } = await supabase
    .from("lessons")
    .select(
      "id, course_id, position, title, description, free_preview, mux_playback_id, kind, available_after_days, pass_threshold"
    )
    .eq("id", lessonId)
    .single();

  if (!lesson || lesson.course_id !== courseId) notFound();

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("course_id, enrolled_at")
    .eq("course_id", courseId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!enrollment && !lesson.free_preview) {
    redirect(`/learn/${courseId}`);
  }

  // Drip lock
  const unlockAt = computeUnlockAt(enrollment?.enrolled_at, lesson.available_after_days);
  const drippedLocked = enrollment ? isLockedNow(unlockAt) : false;

  const [siblingsRes, courseRes, progressRes] = await Promise.all([
    supabase
      .from("lessons")
      .select("id, position, title")
      .eq("course_id", courseId)
      .order("position", { ascending: true }),
    supabase.from("courses").select("title, level, category").eq("id", courseId).single(),
    supabase
      .from("lesson_progress")
      .select("lesson_id, completed_at")
      .eq("user_id", user.id),
  ]);

  const siblings = siblingsRes.data ?? [];
  const course = courseRes.data;
  const completed = new Set(
    (progressRes.data ?? []).filter((p) => p.completed_at).map((p) => p.lesson_id)
  );
  const idx = siblings.findIndex((l) => l.id === lessonId);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
  const completedCount = siblings.filter((l) => completed.has(l.id)).length;
  const totalCount = siblings.length;
  const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div style={{ backgroundColor: "#edf8ff" }} className="min-h-screen">
      {/* Top app bar */}
      <header className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl shadow-sm flex justify-between items-center px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/learn/${courseId}`}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Back to course"
          >
            <span className="material-symbols-outlined" style={{ color: "#243036" }}>
              arrow_back
            </span>
          </Link>
          <Link
            href="/"
            className="text-2xl font-black italic tracking-tight"
            style={{ color: "#7c3900", fontFamily: "var(--font-headline)" }}
          >
            Keta Tov
          </Link>
        </div>
        <nav className="hidden md:flex gap-6 font-bold tracking-tight" style={{ fontFamily: "var(--font-headline)" }}>
          <Link href="/dashboard" className="text-slate-600 hover:text-orange-500">
            Dashboard
          </Link>
          <Link href="/courses" className="border-b-2 pb-1" style={{ color: "#7c3900", borderColor: "#ff8f00" }}>
            Courses
          </Link>
          <Link href="/profile" className="text-slate-600 hover:text-orange-500">
            Profile
          </Link>
        </nav>
      </header>

      <main className="pt-24 pb-32 px-4 md:px-8 lg:px-12 max-w-[1600px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Stage */}
          <div className="flex-grow space-y-8 min-w-0">
            {drippedLocked && unlockAt ? (
              <div
                className="rounded-[2rem] p-12 text-center"
                style={{ backgroundColor: "#dbebf4" }}
              >
                <span
                  className="material-symbols-outlined text-5xl block mb-3"
                  style={{ color: "#8b4b00" }}
                >
                  schedule
                </span>
                <h2
                  className="text-2xl font-extrabold mb-2"
                  style={{ fontFamily: "var(--font-headline)", color: "#243036" }}
                >
                  This lesson unlocks on {formatUnlockDate(unlockAt)}
                </h2>
                <p style={{ color: "#515d64" }}>
                  Lessons in this course are released on a schedule to help you absorb each step.
                </p>
              </div>
            ) : lesson.kind === "quiz" ? (
              <div className="rounded-[2rem] bg-white shadow-xl">
                <QuizPlayer
                  lessonId={lesson.id}
                  passThreshold={lesson.pass_threshold ?? 70}
                />
              </div>
            ) : (
              <div className="rounded-[2rem] overflow-hidden shadow-xl ring-1 ring-white/10 bg-black">
                <LessonPlayer
                  lessonId={lesson.id}
                  hasPlayback={Boolean(lesson.mux_playback_id)}
                />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <div>
                  <p
                    className="text-xs font-bold uppercase tracking-widest mb-2"
                    style={{ color: "#8b4b00" }}
                  >
                    {course ? `${course.category} · ${course.level}` : ""}
                  </p>
                  <h1
                    className="text-3xl font-extrabold tracking-tight mb-3"
                    style={{ fontFamily: "var(--font-headline)", color: "#243036" }}
                  >
                    Lesson {lesson.position.toString().padStart(2, "0")}: {lesson.title}
                  </h1>
                  {lesson.description && (
                    <p className="leading-relaxed" style={{ color: "#515d64" }}>
                      {lesson.description}
                    </p>
                  )}
                </div>

                {/* Resources placeholder */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    className="p-6 rounded-[1rem] flex items-center gap-4 opacity-70"
                    style={{ backgroundColor: "#e4f3fc" }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "#a6eff3", color: "#0e666a" }}
                    >
                      <span className="material-symbols-outlined">description</span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold truncate" style={{ fontFamily: "var(--font-headline)", color: "#243036" }}>
                        Lesson worksheet
                      </div>
                      <div className="text-xs" style={{ color: "#515d64" }}>
                        Coming soon
                      </div>
                    </div>
                  </div>
                  <div
                    className="p-6 rounded-[1rem] flex items-center gap-4 opacity-70"
                    style={{ backgroundColor: "#e4f3fc" }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: "#a6eff3", color: "#0e666a" }}
                    >
                      <span className="material-symbols-outlined">music_note</span>
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold truncate" style={{ fontFamily: "var(--font-headline)", color: "#243036" }}>
                        Beat map
                      </div>
                      <div className="text-xs" style={{ color: "#515d64" }}>
                        Coming soon
                      </div>
                    </div>
                  </div>
                </div>

                {/* Prev/next nav */}
                <nav className="flex items-center justify-between gap-4 pt-2">
                  {prev ? (
                    <Link
                      href={`/learn/${courseId}/${prev.id}`}
                      className="px-5 py-2.5 rounded-full font-bold text-sm border-2 truncate max-w-[45%]"
                      style={{ borderColor: "#8b4b00", color: "#8b4b00" }}
                    >
                      ← {prev.position}. {prev.title}
                    </Link>
                  ) : (
                    <span />
                  )}
                  {next ? (
                    <Link
                      href={`/learn/${courseId}/${next.id}`}
                      className="kinetic-gradient px-5 py-2.5 rounded-full font-bold text-sm shadow-md truncate max-w-[55%]"
                      style={{ color: "#fff0e6" }}
                    >
                      Next: {next.title} →
                    </Link>
                  ) : (
                    <span />
                  )}
                </nav>
              </div>

              {/* Expert Insight */}
              <div className="bg-white p-6 rounded-[2rem] shadow-sm space-y-4 self-start">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: "#fdd400", color: "#594a00" }}
                  >
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                      person
                    </span>
                  </div>
                  <div>
                    <div
                      className="text-sm font-bold uppercase tracking-wider"
                      style={{ color: "#6d5a00" }}
                    >
                      Expert vault
                    </div>
                    <div className="font-bold" style={{ fontFamily: "var(--font-headline)", color: "#243036" }}>
                      Coach Roni
                    </div>
                  </div>
                </div>
                <p className="text-sm italic leading-snug" style={{ color: "#515d64" }}>
                  &ldquo;Keep your shoulders square. The dog mirrors your torso, not just your hands.&rdquo;
                </p>
                <Link
                  href="/dashboard"
                  className="block text-center w-full py-3 rounded-full font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all"
                  style={{ backgroundColor: "#fdd400", color: "#594a00", fontFamily: "var(--font-headline)" }}
                >
                  Ask a question
                </Link>
              </div>
            </div>
          </div>

          {/* Lesson sidebar */}
          <aside className="lg:w-96 flex-shrink-0">
            <div
              className="rounded-[2rem] sticky top-24 overflow-hidden border"
              style={{ backgroundColor: "#dbebf4", borderColor: "rgba(162,175,182,0.2)" }}
            >
              <div
                className="p-6 flex justify-between items-center"
                style={{ backgroundColor: "#d4e5ef" }}
              >
                <div>
                  <h2
                    className="font-extrabold text-xl"
                    style={{ fontFamily: "var(--font-headline)", color: "#243036" }}
                  >
                    Course progress
                  </h2>
                  <p className="text-sm font-bold" style={{ color: "#0e666a" }}>
                    {completedCount} of {totalCount} lessons
                  </p>
                </div>
                <ProgressRing pct={pct} />
              </div>

              <div className="max-h-[600px] overflow-y-auto">
                {siblings.map((s) => {
                  const isCurrent = s.id === lessonId;
                  const isDone = completed.has(s.id);
                  return (
                    <Link
                      key={s.id}
                      href={`/learn/${courseId}/${s.id}`}
                      className={`p-4 flex items-center gap-4 transition-colors cursor-pointer group ${
                        isCurrent
                          ? "border-l-4"
                          : "hover:bg-[#dbebf4] border-l-4 border-transparent"
                      }`}
                      style={
                        isCurrent
                          ? {
                              backgroundColor: "rgba(255,143,0,0.12)",
                              borderColor: "#8b4b00",
                            }
                          : undefined
                      }
                    >
                      <div className="relative">
                        <div
                          className="w-12 h-12 rounded-[0.5rem] flex items-center justify-center"
                          style={{
                            backgroundColor: isCurrent
                              ? "#ff8f00"
                              : isDone
                                ? "#cde0ea"
                                : "#cde0ea",
                            color: isCurrent ? "#462300" : "#243036",
                          }}
                        >
                          <span className="material-symbols-outlined">
                            {isCurrent ? "play_circle" : isDone ? "check" : "lock_open"}
                          </span>
                        </div>
                        {isDone && !isCurrent && (
                          <div
                            className="absolute -bottom-1 -right-1 rounded-full p-0.5 ring-2"
                            style={{
                              backgroundColor: "#0e666a",
                              color: "#ffffff",
                              boxShadow: "0 0 0 2px #dbebf4",
                            }}
                          >
                            <span
                              className="material-symbols-outlined text-[14px]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              check
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex-grow min-w-0">
                        <div
                          className="text-xs uppercase tracking-wider font-bold"
                          style={{
                            color: isCurrent ? "#8b4b00" : "#6c7980",
                          }}
                        >
                          Lesson {s.position.toString().padStart(2, "0")}
                          {isCurrent ? " · Current" : ""}
                        </div>
                        <div
                          className="font-bold truncate"
                          style={{
                            fontFamily: "var(--font-headline)",
                            color: isCurrent ? "#462300" : isDone ? "#515d64" : "#243036",
                            textDecoration: isDone && !isCurrent ? "line-through" : "none",
                            opacity: isDone && !isCurrent ? 0.6 : 1,
                          }}
                        >
                          {s.title}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative w-12 h-12">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} stroke="#a2afb6" strokeOpacity="0.25" strokeWidth="4" fill="none" />
        <circle
          cx="22"
          cy="22"
          r={r}
          stroke="#0e666a"
          strokeWidth="4"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-xs font-bold"
        style={{ color: "#0e666a" }}
      >
        {pct}%
      </span>
    </div>
  );
}
