import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadStudentCourse } from "@/lib/student-course-server";
import { NextChapterOffer } from "@/components/app/NextChapterOffer";
import { lessonNeighbors } from "@/lib/course-progress";
import { dogName, requireMember } from "@/lib/member/viewer";
import { Ms, formatMinutes } from "@/components/app/ui";
import { LocalTime } from "@/components/ui/LocalTime";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lesson complete" };

export default async function LessonCompletePage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params;
  const viewer = await requireMember(`/learn/${courseId}/${lessonId}/complete`);
  const supabase = await createClient();
  const data = await loadStudentCourse(supabase, courseId, viewer.userId);
  if (!data) notFound();
  const lesson = data.lessons.find((l) => l.id === lessonId);
  if (!lesson) notFound();
  // Only for a lesson the member actually finished.
  if (data.states.get(lessonId)?.kind !== "completed") redirect(`/learn/${courseId}/${lessonId}`);

  const [{ count: sessions }, certRes] = await Promise.all([
    supabase.from("practice_sessions").select("id", { count: "exact", head: true }).eq("lesson_id", lessonId),
    supabase.from("certificates").select("code").eq("user_id", viewer.userId).eq("course_id", courseId).maybeSingle(),
  ]);
  const { next, number } = lessonNeighbors(data.lessons, lessonId);
  const nextState = next ? data.states.get(next.id) : null;
  const courseDone = data.progress.completed >= data.progress.total && data.progress.total > 0;
  const dog = dogName(viewer);

  return (
    <>
    <div className="card" style={{ maxWidth: 880, margin: "0 auto", width: "100%", alignItems: "center", textAlign: "center", padding: "52px 40px", gap: 22 }}>
      <div className="sketch" style={{ width: 180, height: 180, borderRadius: "50%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- illustration */}
        <img src="/app/img/dancing-skills.jpg" alt="" style={{ width: 150 }} />
      </div>
      <span className="eyebrow">{courseDone ? `${data.course.title} complete` : `Lesson ${number} complete`}</span>
      <h1 className="display">Beautiful work{viewer.activeDog ? `, ${viewer.activeDog.name}` : ""}.</h1>
      <p className="lede">
        {courseDone
          ? `You and ${dog} finished every lesson of ${data.course.title}.${certRes.data ? " Your certificate is ready." : ""}`
          : `“${lesson.title}” is done. Practice it a couple of times before moving on — short sessions stick best.`}
      </p>
      <div className="grid-3" style={{ width: "100%", maxWidth: 620, textAlign: "left" }}>
        <div className="stat">
          <b>{formatMinutes(lesson.duration_seconds) ?? "—"}</b>
          <span>Lesson length</span>
        </div>
        <div className="stat">
          <b>{sessions ?? 0}</b>
          <span>Practice sessions on it</span>
        </div>
        <div className="stat">
          <b>
            {data.progress.completed} / {data.progress.total}
          </b>
          <span>Lessons in {data.course.title}</span>
        </div>
      </div>
      <div className="divider" style={{ width: "100%" }} />
      {next && nextState && (
        <div className="row" style={{ justifyContent: "center", gap: 18 }}>
          <div className={`state-ic ${nextState.kind === "scheduled" || nextState.kind === "locked" ? "lock" : "next"}`}>
            <Ms name={nextState.kind === "scheduled" ? "lock_clock" : "play_arrow"} size="sm" />
          </div>
          <div style={{ textAlign: "left" }}>
            <b>
              Lesson {number + 1} · {next.title}
            </b>
            <div className="faint">
              {nextState.kind === "scheduled" ? (
                <>
                  Opens <LocalTime iso={nextState.unlockAt.toISOString()} format="longDate" />. Keep practicing until then.
                </>
              ) : nextState.kind === "upgrade" ? (
                "Part of the full chapter."
              ) : (
                "Ready when you are."
              )}
            </div>
          </div>
        </div>
      )}
      <div className="row" style={{ justifyContent: "center" }}>
        {courseDone && certRes.data ? (
          <Link className="btn btn-primary" href={`/certificates/${certRes.data.code}`}>
            <Ms name="workspace_premium" />
            See your certificate
          </Link>
        ) : next && nextState && (nextState.kind === "open" || nextState.kind === "completed") ? (
          <Link className="btn btn-primary" href={`/learn/${courseId}/${next.id}`}>
            Next lesson
            <Ms name="arrow_forward" size="sm" />
          </Link>
        ) : (
          <Link className="btn btn-primary" href="/plan">
            Plan my next session
          </Link>
        )}
        <Link className="btn btn-ghost" href={`/practice?lesson=${lessonId}`}>
          Practice this lesson
        </Link>
        <Link className="btn btn-ghost" href={`/feedback/new?lesson=${lessonId}`}>
          Send a video to Roni
        </Link>
      </div>
    </div>
    {/* From 80% of the chapter: the next chapter, with the member's personal code when a flow offers one. */}
    <div style={{ maxWidth: 880, margin: "0 auto", width: "100%" }}>
      <NextChapterOffer userId={viewer.userId} courseId={courseId} percentDone={data.progress.percent} />
    </div>
    </>
  );
}
