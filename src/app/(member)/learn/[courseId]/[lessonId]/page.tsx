import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { lessonNeighbors } from "@/lib/course-progress";
import { loadStudentCourse } from "@/lib/student-course-server";
import { chapterLock } from "@/lib/member/chapter-lock";
import { dogName, requireMember } from "@/lib/member/viewer";
import { Breadcrumbs, Ms, StateCard, Tip } from "@/components/app/ui";
import { LocalTime } from "@/components/ui/LocalTime";
import LessonPlayer from "./LessonPlayer";
import QuizPlayer from "./QuizPlayer";
import { CompleteLessonButton } from "./CompleteLessonButton";
import { LessonAside } from "./LessonAside";
import { DownloadsTab, OverviewTab, PracticeTab, QuestionsTab, TabBar, type QuestionRow } from "./LessonTabs";
import { asTab, parsePracticeSteps } from "./lesson-data";

export const dynamic = "force-dynamic";

export default async function LessonPage({ params, searchParams }: { params: Promise<{ courseId: string; lessonId: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { courseId, lessonId } = await params;
  const tab = asTab((await searchParams).tab);
  const viewer = await requireMember(`/learn/${courseId}/${lessonId}`);
  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, course_id, title, description, kind, pass_threshold, duration_seconds, key_takeaways, cues, practice_steps, practice_minutes")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson || lesson.course_id !== courseId) notFound();

  // Same rule as playback/API: free preview, live content + unexpired enrollment + drip, or staff preview.
  const [data, { data: canAccess }, videoRes, filesRes, questionsRes] = await Promise.all([
    loadStudentCourse(supabase, courseId, viewer.userId),
    supabase.rpc("can_access_lesson", { p_lesson_id: lessonId }),
    createServiceClient().from("lesson_videos").select("lesson_id").eq("lesson_id", lessonId).maybeSingle(),
    supabase.from("lesson_files").select("id, file_name, size_bytes").eq("lesson_id", lessonId).order("position"),
    supabase.rpc("lesson_questions_for", { p_lesson_id: lessonId }),
  ]);
  if (!data) notFound();

  const state = data.states.get(lessonId);
  const scheduled = state?.kind === "scheduled" ? state : null;
  // Without access (and not merely waiting for a drip date) the course page shows how to get it.
  if (!canAccess && !scheduled) redirect(`/learn/${courseId}`);
  // "Opens after …": members finish the previous chapter first (free previews stay open).
  const lock = await chapterLock(supabase, data, viewer.userId);
  const isFreePreview = data.lessons.find((l) => l.id === lessonId)?.free_preview ?? false;
  if (lock.locked && !isFreePreview) redirect(`/learn/${courseId}`);

  // Lesson text is server-only: loaded only when the member may actually open the lesson.
  const bodyHtml = canAccess && !scheduled ? ((await createServiceClient().from("lessons").select("body_html").eq("id", lessonId).single()).data?.body_html ?? null) : null;

  const { prev, next, number } = lessonNeighbors(data.lessons, lessonId);
  const files = filesRes.data ?? [];
  const questions = (questionsRes.data ?? []) as QuestionRow[];
  const steps = parsePracticeSteps(lesson.practice_steps);
  const completed = state?.kind === "completed";
  const base = `/learn/${courseId}/${lessonId}`;
  const lessonHref = (id: string) => `/learn/${courseId}/${id}`;
  const idx = data.lessons.findIndex((l) => l.id === lessonId);
  const checkpoint = data.lessons.slice(idx + 1).find((l) => l.kind === "quiz" && ["open", "completed"].includes(data.states.get(l.id)?.kind ?? ""));

  return (
    <>
      {data.isStaffPreview && (
        <Tip icon="visibility">
          <b>Preview mode.</b> You&apos;re seeing this lesson as a team member.{" "}
          <Link className="link" href={`/admin/courses/${courseId}`}>
            Back to admin
          </Link>
        </Tip>
      )}
      <Breadcrumbs items={[{ href: "/my-courses", label: "My Courses" }, { href: `/learn/${courseId}`, label: data.course.title }, { label: `Lesson ${number || ""}` }]} />
      <div className="grid-main">
        <div className="stack-lg">
          {scheduled ? (
            <StateCard icon="lock_clock" tone="orange" eyebrow="Locked lesson" title={`${lesson.title} opens soon`}>
              <>
                Opens <LocalTime iso={scheduled.unlockAt.toISOString()} format="longDate" />. Keep practising the lessons before it until then — it&apos;s how each skill settles.
              </>
            </StateCard>
          ) : lesson.kind === "quiz" ? (
            <QuizPlayer lessonId={lesson.id} passThreshold={lesson.pass_threshold ?? 70} lessonNumber={number} nextHref={next ? lessonHref(next.id) : `/learn/${courseId}`} />
          ) : (
            <div className="player" data-tour="player">
              <LessonPlayer lessonId={lesson.id} hasPlayback={Boolean(videoRes.data)} />
            </div>
          )}

          <div className="between">
            <div className="head-block">
              <span className="eyebrow">
                {data.course.title} · Lesson {number || "–"}
              </span>
              <h1 className="h1">{lesson.title}</h1>
            </div>
            <div className="row">
              <Link className="btn btn-ghost btn-sm" href={`/feedback/new?lesson=${lessonId}`} data-tour="send-video">
                <Ms name="videocam" size="sm" />
                Send a video to Roni
              </Link>
            </div>
          </div>

          <nav className="action-bar" aria-label="Lesson navigation" style={{ position: "static" }}>
            {prev ? (
              <Link className="btn btn-ghost btn-sm" href={lessonHref(prev.id)} aria-label={`Previous: ${prev.title}`}>
                <Ms name="arrow_back" size="sm" />
                Previous
              </Link>
            ) : (
              <span />
            )}
            <div className="row">
              {!scheduled && lesson.kind !== "quiz" && <CompleteLessonButton lessonId={lesson.id} completed={completed} doneHref={`${base}/complete`} />}
              {next && (
                <Link className="btn btn-ghost btn-sm" href={lessonHref(next.id)} aria-label={`Next: ${next.title}`}>
                  Next
                  <Ms name="arrow_forward" size="sm" />
                </Link>
              )}
            </div>
          </nav>

          {!scheduled && (
            <>
              <TabBar base={base} active={tab} questionCount={questions.length} fileCount={files.length} stepCount={steps.length} />
              {tab === "overview" && <OverviewTab description={lesson.description} bodyHtml={bodyHtml} cues={lesson.cues ?? []} takeaways={lesson.key_takeaways ?? []} dog={dogName(viewer)} />}
              {tab === "practice" && <PracticeTab steps={steps} lessonId={lessonId} minutes={lesson.practice_minutes} />}
              {tab === "downloads" && <DownloadsTab lessonId={lessonId} files={files} />}
              {tab === "questions" && <QuestionsTab questions={questions} lessonId={lessonId} courseId={courseId} />}
            </>
          )}
        </div>
        <LessonAside data={data} lessonId={lessonId} hasSteps={steps.length > 0} checkpointHref={checkpoint ? lessonHref(checkpoint.id) : null} />
      </div>
    </>
  );
}
