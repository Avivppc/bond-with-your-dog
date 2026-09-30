import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatUnlockDate } from "@/lib/drip";
import { lessonNeighbors } from "@/lib/course-progress";
import { loadStudentCourse } from "@/lib/student-course-server";
import { LearnLayout } from "@/components/learn/LearnLayout";
import { LEARN } from "@/components/learn/CourseSidebar";
import LessonPlayer from "./LessonPlayer";
import { LessonContent } from "./LessonContent";
import QuizPlayer from "./QuizPlayer";
import { CompleteLessonButton } from "./CompleteLessonButton";
import AskCoachFab from "@/components/member/AskCoachFab";

export const dynamic = "force-dynamic";

function minutes(seconds: number | null): string | null {
  return seconds ? `${Math.max(1, Math.round(seconds / 60))} minute${Math.round(seconds / 60) === 1 ? "" : "s"}` : null;
}

export default async function LessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/learn/${courseId}/${lessonId}`);

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, course_id, title, description, kind, pass_threshold, duration_seconds")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson || lesson.course_id !== courseId) notFound();

  // Same rule as playback/API: free preview, live content + unexpired enrollment + drip, or staff preview.
  const [data, { data: canAccess }, videoRes, filesRes] = await Promise.all([
    loadStudentCourse(supabase, courseId, user.id),
    supabase.rpc("can_access_lesson", { p_lesson_id: lessonId }),
    createServiceClient().from("lesson_videos").select("lesson_id").eq("lesson_id", lessonId).maybeSingle(),
    supabase.from("lesson_files").select("id, file_name, size_bytes").eq("lesson_id", lessonId).order("position"),
  ]);
  if (!data) notFound();

  const state = data.states.get(lessonId);
  const scheduled = state?.kind === "scheduled" ? state : null;
  // Without access (and not merely waiting for a drip date) the course page shows how to get it.
  if (!canAccess && !scheduled) redirect(`/learn/${courseId}`);

  // Lesson text is server-only: loaded only when the student may actually open the lesson.
  const bodyHtml =
    canAccess && !scheduled
      ? ((await createServiceClient().from("lessons").select("body_html").eq("id", lessonId).single()).data?.body_html ?? null)
      : null;

  const { prev, next, number } = lessonNeighbors(data.lessons, lessonId);
  const files = filesRes.data ?? [];
  const completed = state?.kind === "completed";
  const lessonHref = (id: string) => `/learn/${courseId}/${id}`;

  return (
    <LearnLayout data={data} variant="lesson" currentLessonId={lessonId}>
      <section className="overflow-hidden rounded-[2rem] bg-white shadow-xl">
        {scheduled ? (
          <div className="px-6 py-16 text-center" style={{ backgroundColor: "#dbebf4" }}>
            <span className="material-symbols-outlined mb-3 block text-5xl" style={{ color: LEARN.teal }} aria-hidden>
              schedule
            </span>
            <h2 className="text-xl font-extrabold" style={{ fontFamily: "var(--font-headline)" }}>
              This lesson unlocks on {formatUnlockDate(scheduled.unlockAt)}
            </h2>
            <p className="mt-1 text-sm" style={{ color: LEARN.muted }}>
              Lessons are released on a schedule to help you absorb each step.
            </p>
          </div>
        ) : lesson.kind === "quiz" ? (
          <QuizPlayer lessonId={lesson.id} passThreshold={lesson.pass_threshold ?? 70} />
        ) : (
          <div className="bg-black">
            <LessonPlayer lessonId={lesson.id} hasPlayback={Boolean(videoRes.data)} />
          </div>
        )}

        <nav className="flex flex-wrap items-center gap-3 border-t border-[#edf3f7] px-4 py-3" aria-label="Lesson navigation">
          {prev ? (
            <Link href={lessonHref(prev.id)} aria-label={`Previous: ${prev.title}`} className="flex rounded-full border border-[#d4e5ef] p-1.5 hover:bg-[#f3f9fd]">
              <span className="material-symbols-outlined text-[20px]" aria-hidden>
                chevron_left
              </span>
            </Link>
          ) : (
            <span className="w-9" />
          )}
          {minutes(lesson.duration_seconds) && (
            <span className="flex items-center gap-1 text-xs" style={{ color: LEARN.muted }}>
              <span className="material-symbols-outlined text-[16px]" aria-hidden>
                schedule
              </span>
              {minutes(lesson.duration_seconds)}
            </span>
          )}
          {files.length > 0 && !scheduled && (
            <a href="#resources" className="flex items-center gap-1 text-xs hover:underline" style={{ color: LEARN.muted }}>
              <span className="material-symbols-outlined text-[16px]" aria-hidden>
                download
              </span>
              {files.length} {files.length === 1 ? "resource" : "resources"}
            </a>
          )}
          <span className="flex-1" />
          {!scheduled && lesson.kind !== "quiz" && (
            <CompleteLessonButton lessonId={lesson.id} completed={completed} nextHref={next ? lessonHref(next.id) : null} />
          )}
          {next ? (
            <Link href={lessonHref(next.id)} aria-label={`Next: ${next.title}`} className="flex rounded-full border border-[#d4e5ef] p-1.5 hover:bg-[#f3f9fd]">
              <span className="material-symbols-outlined text-[20px]" aria-hidden>
                chevron_right
              </span>
            </Link>
          ) : (
            <span className="w-9" />
          )}
        </nav>
      </section>

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <header>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: LEARN.brown }}>
              Lesson {String(number || 0).padStart(2, "0")} of {data.lessons.length}
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight" style={{ fontFamily: "var(--font-headline)" }}>
              {lesson.title}
            </h1>
            {lesson.description && !scheduled && (
              <p className="mt-3 leading-relaxed" style={{ color: LEARN.muted }}>
                {lesson.description}
              </p>
            )}
          </header>
          {!scheduled && (
            <div id="resources">
              <LessonContent lessonId={lessonId} bodyHtml={bodyHtml} files={files} />
            </div>
          )}
        </div>
        <ExpertVault />
      </div>

      {next && !scheduled && (
        <Link href={lessonHref(next.id)} className="flex items-center justify-between gap-4 rounded-[2rem] bg-white p-6 shadow-sm hover:bg-[#f3f9fd]">
          <span className="min-w-0">
            <span className="block text-xs font-bold" style={{ color: LEARN.orange }}>
              Up next
            </span>
            <span className="block truncate font-extrabold" style={{ fontFamily: "var(--font-headline)" }}>
              {next.title}
            </span>
          </span>
          <span className="material-symbols-outlined" style={{ color: LEARN.teal }} aria-hidden>
            arrow_forward
          </span>
        </Link>
      )}
    </LearnLayout>
  );
}

/** "Expert vault": a coaching tip and a direct line to Roni's team. */
function ExpertVault() {
  return (
    <aside className="space-y-4 self-start rounded-[2rem] bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#fdd400] text-[#594a00]" aria-hidden>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
            person
          </span>
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#6d5a00]">Expert vault</p>
          <p className="font-bold" style={{ fontFamily: "var(--font-headline)" }}>
            Coach Roni
          </p>
        </div>
      </div>
      <p className="text-sm italic leading-snug" style={{ color: LEARN.muted }}>
        &ldquo;Keep your shoulders square. The dog mirrors your torso, not just your hands.&rdquo;
      </p>
      <AskCoachFab variant="card" />
    </aside>
  );
}
