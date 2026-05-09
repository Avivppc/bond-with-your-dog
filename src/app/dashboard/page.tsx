import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MemberShell from "@/components/member/MemberShell";
import AskCoachFab from "@/components/member/AskCoachFab";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const [profileRes, enrollmentsRes, progressRes, achievementsRes, defsRes, certsRes] = await Promise.all([
    supabase.from("profiles").select("full_name, dog_name, dog_breed, avatar_url").eq("id", user.id).single(),
    supabase
      .from("enrollments")
      .select("course_id, enrolled_at, courses(*)")
      .order("enrolled_at", { ascending: false }),
    supabase.from("lesson_progress").select("lesson_id, completed_at, lessons(course_id)").eq("user_id", user.id),
    supabase.from("achievements").select("code, earned_at").eq("user_id", user.id),
    supabase.from("achievement_defs").select("*"),
    supabase
      .from("certificates")
      .select("code, course_title, issued_at")
      .eq("user_id", user.id)
      .order("issued_at", { ascending: false }),
  ]);

  const profile = profileRes.data;
  const enrollments = enrollmentsRes.data ?? [];
  const progress = progressRes.data ?? [];
  const earned = new Set((achievementsRes.data ?? []).map((a) => a.code));
  const defs = defsRes.data ?? [];
  const certs = certsRes.data ?? [];

  const firstName = profile?.full_name?.split(" ")[0] || "friend";
  const dogName = profile?.dog_name;

  // Pick "current course" = most recently enrolled with at least one incomplete lesson
  const currentEnrollment = enrollments[0];
  let currentCourse: {
    id: string;
    title: string;
    image: string | null;
    image_alt: string | null;
    completedCount: number;
    totalCount: number;
    pct: number;
    nextLessonId: string | null;
    nextLessonTitle: string | null;
  } | null = null;

  if (currentEnrollment) {
    const c = currentEnrollment.courses as unknown as {
      id: string;
      title: string;
      image: string | null;
      image_alt: string | null;
    };
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, position, title")
      .eq("course_id", c.id)
      .order("position", { ascending: true });
    const completedSet = new Set(
      progress.filter((p) => p.completed_at).map((p) => p.lesson_id)
    );
    const completedCount = (lessons ?? []).filter((l) => completedSet.has(l.id)).length;
    const totalCount = lessons?.length ?? 0;
    const next = (lessons ?? []).find((l) => !completedSet.has(l.id)) || null;
    currentCourse = {
      id: c.id,
      title: c.title,
      image: c.image,
      image_alt: c.image_alt,
      completedCount,
      totalCount,
      pct: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
      nextLessonId: next?.id ?? null,
      nextLessonTitle: next?.title ?? null,
    };
  }

  // Aggregate progress percent across all enrollments
  const totalCompleted = progress.filter((p) => p.completed_at).length;

  return (
    <MemberShell>
      <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-12">
        {/* Hero */}
        <section
          className="relative rounded-[2rem] p-8 md:p-12 overflow-hidden flex flex-col md:flex-row items-center gap-8"
          style={{ backgroundColor: "#dbebf4" }}
        >
          <div className="flex-1 z-10">
            <h1
              className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2"
              style={{ fontFamily: "var(--font-headline)", color: "#243036" }}
            >
              Welcome back, {firstName}
              {dogName ? ` & ${dogName}` : ""}!
            </h1>
            <p className="text-lg font-medium mb-8" style={{ color: "#515d64" }}>
              {totalCompleted > 0
                ? `You're making incredible progress — ${totalCompleted} lesson${totalCompleted === 1 ? "" : "s"} completed.`
                : "Pick up where you left off, or explore a new routine."}
            </p>
            {currentCourse && (
              <div className="bg-white/60 backdrop-blur rounded-2xl p-6 max-w-md">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-sm font-bold uppercase tracking-wider" style={{ color: "#8b4b00" }}>
                    {currentCourse.title.split(":")[0]}
                  </span>
                  <span
                    className="text-2xl font-black"
                    style={{ fontFamily: "var(--font-headline)", color: "#243036" }}
                  >
                    {currentCourse.pct}%
                  </span>
                </div>
                <div className="h-3 w-full rounded-full overflow-hidden" style={{ backgroundColor: "#d4e5ef" }}>
                  <div
                    className="h-full kinetic-gradient rounded-full"
                    style={{ width: `${currentCourse.pct}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          {currentCourse?.image && (
            <div className="relative w-full md:w-1/3 flex justify-center">
              <div className="absolute inset-0 blur-3xl rounded-full" style={{ backgroundColor: "rgba(255,143,0,0.2)" }} />
              <Image
                src={currentCourse.image}
                alt={currentCourse.image_alt || ""}
                width={256}
                height={256}
                className="relative z-10 rounded-3xl rotate-3 shadow-2xl object-cover w-64 h-64"
                unoptimized
              />
            </div>
          )}
        </section>

        {/* Bento */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: current course + my courses */}
          <div className="lg:col-span-2 space-y-8">
            {currentCourse && currentCourse.nextLessonId ? (
              <div className="bg-white rounded-[2rem] p-1 shadow-sm group">
                <div
                  className="relative overflow-hidden rounded-[1.8rem] p-8 flex flex-col md:flex-row gap-8"
                  style={{ backgroundColor: "#0e666a", color: "#c8fcff" }}
                >
                  <div className="flex-1 space-y-6">
                    <div className="inline-flex px-4 py-1 bg-white/10 rounded-full text-xs font-bold uppercase tracking-widest">
                      Continue learning
                    </div>
                    <h2
                      className="text-3xl font-extrabold leading-tight"
                      style={{ fontFamily: "var(--font-headline)" }}
                    >
                      {currentCourse.title}
                    </h2>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-semibold opacity-80">
                        <span>Course Progress</span>
                        <span>
                          {currentCourse.completedCount} of {currentCourse.totalCount} lessons
                        </span>
                      </div>
                      <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full"
                          style={{ width: `${currentCourse.pct}%` }}
                        />
                      </div>
                    </div>
                    <Link
                      href={`/learn/${currentCourse.id}/${currentCourse.nextLessonId}`}
                      className="inline-flex items-center gap-4 px-8 py-4 rounded-full font-bold shadow-xl"
                      style={{ backgroundColor: "#ff8f00", color: "#462300" }}
                    >
                      <span>Next: {currentCourse.nextLessonTitle}</span>
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] p-10 text-center shadow-sm">
                <span className="material-symbols-outlined text-5xl block mb-3" style={{ color: "#a2afb6" }}>
                  school
                </span>
                <p className="text-lg font-bold mb-2" style={{ color: "#243036" }}>
                  Ready to start?
                </p>
                <p className="text-sm mb-6" style={{ color: "#515d64" }}>
                  Browse the catalog and pick your first course.
                </p>
                <Link
                  href="/courses"
                  className="inline-block kinetic-gradient px-6 py-3 rounded-full font-bold text-sm shadow-md"
                  style={{ color: "#fff0e6" }}
                >
                  Browse courses
                </Link>
              </div>
            )}

            {/* My courses */}
            {enrollments.length > 0 && (
              <section>
                <div className="flex justify-between items-center mb-6 px-2">
                  <h3
                    className="text-2xl font-extrabold tracking-tight"
                    style={{ fontFamily: "var(--font-headline)", color: "#243036" }}
                  >
                    My courses
                  </h3>
                  <Link
                    href="/courses"
                    className="text-sm font-bold flex items-center gap-1 hover:underline"
                    style={{ color: "#0e666a" }}
                  >
                    Browse more <span className="material-symbols-outlined text-sm">open_in_new</span>
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {enrollments.map((e) => {
                    const course = e.courses as unknown as {
                      id: string;
                      title: string;
                      level: string;
                      category: string;
                      image: string | null;
                      image_alt: string | null;
                    };
                    return (
                      <Link
                        key={course.id}
                        href={`/learn/${course.id}`}
                        className="bg-white rounded-[2rem] p-4 space-y-4 shadow-sm border-b-4 border-transparent hover:border-[#8b4b00] transition-all group"
                      >
                        <div className="relative aspect-video rounded-2xl overflow-hidden">
                          {course.image && (
                            <Image
                              src={course.image}
                              alt={course.image_alt || course.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              unoptimized
                            />
                          )}
                        </div>
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-bold" style={{ color: "#243036" }}>
                              {course.title}
                            </h4>
                            <p className="text-xs" style={{ color: "#515d64" }}>
                              {course.category} · {course.level}
                            </p>
                          </div>
                          <span className="material-symbols-outlined" style={{ color: "#8b4b00" }}>
                            arrow_forward
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </div>

          {/* Right: profile mini + achievements + news */}
          <aside className="space-y-8">
            {/* Profile mini */}
            <div className="bg-[#cde0ea]/40 rounded-[2rem] p-6 flex items-center gap-4">
              <div className="relative">
                <div
                  className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-md flex items-center justify-center text-2xl font-extrabold"
                  style={{ backgroundColor: "#a6eff3", color: "#005b5f", fontFamily: "var(--font-headline)" }}
                >
                  {firstName.charAt(0).toUpperCase()}
                </div>
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-500 border-2 border-white rounded-full" />
              </div>
              <div>
                <h4 className="font-bold" style={{ color: "#243036" }}>
                  {profile?.full_name ?? user.email}
                </h4>
                <div className="flex gap-3 mt-2">
                  <Link
                    href="/profile"
                    className="text-[10px] font-bold uppercase tracking-tight hover:underline"
                    style={{ color: "#0e666a" }}
                  >
                    Account
                  </Link>
                  <Link
                    href="#"
                    className="text-[10px] font-bold uppercase tracking-tight hover:underline"
                    style={{ color: "#0e666a" }}
                  >
                    Support
                  </Link>
                </div>
              </div>
            </div>

            {/* Achievements */}
            <section
              id="achievements"
              className="bg-white rounded-[2rem] p-6 shadow-sm border"
              style={{ borderColor: "#d4e5ef" }}
            >
              <h3
                className="text-lg font-extrabold mb-6 flex items-center gap-2"
                style={{ fontFamily: "var(--font-headline)" }}
              >
                <span className="material-symbols-outlined" style={{ color: "#8b4b00" }}>
                  military_tech
                </span>
                Achievements
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {defs.map((def) => {
                  const has = earned.has(def.code);
                  return (
                    <div key={def.code} className="group relative flex flex-col items-center" title={def.description}>
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center mb-1 group-hover:scale-110 transition-transform ${
                          has ? "" : "grayscale"
                        }`}
                        style={
                          has
                            ? { backgroundColor: "rgba(255,143,0,0.18)", color: "#ff8f00" }
                            : { backgroundColor: "#f1f5f9", color: "#cbd5e1" }
                        }
                      >
                        <span
                          className="material-symbols-outlined"
                          style={has ? { fontVariationSettings: "'FILL' 1" } : undefined}
                        >
                          {def.icon}
                        </span>
                      </div>
                      <span
                        className="text-[8px] font-bold text-center"
                        style={{ color: has ? "#243036" : "#94a3b8" }}
                      >
                        {def.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Certificates */}
            {certs.length > 0 && (
              <section
                className="bg-white rounded-[2rem] p-6 shadow-sm border"
                style={{ borderColor: "#d4e5ef" }}
              >
                <h3
                  className="text-lg font-extrabold mb-4 flex items-center gap-2"
                  style={{ fontFamily: "var(--font-headline)" }}
                >
                  <span className="material-symbols-outlined" style={{ color: "#8b4b00" }}>
                    workspace_premium
                  </span>
                  Certificates
                </h3>
                <ul className="space-y-3">
                  {certs.map((c) => (
                    <li
                      key={c.code}
                      className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate" style={{ color: "#243036" }}>
                          {c.course_title}
                        </p>
                        <p className="text-xs" style={{ color: "#515d64" }}>
                          {new Date(c.issued_at).toLocaleDateString()}
                        </p>
                      </div>
                      <a
                        href={`/api/certificates/${c.code}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold flex items-center gap-1 shrink-0"
                        style={{ color: "#8b4b00" }}
                      >
                        Download <span className="material-symbols-outlined text-sm">download</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Static news placeholder */}
            <section className="space-y-4">
              <h3
                className="text-lg font-extrabold px-2"
                style={{ fontFamily: "var(--font-headline)", color: "#243036" }}
              >
                Academy News
              </h3>
              <div className="space-y-4">
                <div
                  className="group p-4 bg-white/60 border-l-4 rounded-r-2xl hover:bg-white transition-colors"
                  style={{ borderColor: "#8b4b00" }}
                >
                  <span className="text-[10px] font-bold uppercase" style={{ color: "#8b4b00" }}>
                    New Workshop
                  </span>
                  <h5 className="font-bold text-sm" style={{ color: "#243036" }}>
                    Syncopated Rhythm: Level 2
                  </h5>
                  <p className="text-xs mt-1" style={{ color: "#515d64" }}>
                    Join Roni for a deep dive into beat-matching.
                  </p>
                </div>
                <div
                  className="group p-4 bg-white/60 border-l-4 rounded-r-2xl hover:bg-white transition-colors"
                  style={{ borderColor: "#0e666a" }}
                >
                  <span className="text-[10px] font-bold uppercase" style={{ color: "#0e666a" }}>
                    Live Event
                  </span>
                  <h5 className="font-bold text-sm" style={{ color: "#243036" }}>
                    Upcoming Q&amp;A Live Session
                  </h5>
                  <p className="text-xs mt-1" style={{ color: "#515d64" }}>
                    Friday at 6:00 PM CET. Bring your questions!
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
      <AskCoachFab />
    </MemberShell>
  );
}
