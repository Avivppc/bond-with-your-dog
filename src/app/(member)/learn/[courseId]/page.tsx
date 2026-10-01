import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireMember } from "@/lib/member/viewer";
import { loadStudentCourse } from "@/lib/student-course-server";
import { chapterLock } from "@/lib/member/chapter-lock";
import { formatOfferPrice, type PricedOffer } from "@/lib/pricing";
import { Breadcrumbs, Ms, ProgressLine, Tip, formatMinutes } from "@/components/app/ui";
import { LessonList } from "./LessonList";
import { plural } from "@/lib/feedback/format";

export const dynamic = "force-dynamic";

type PublishedOffer = PricedOffer & { slug: string; title: string; status: string };

export default async function CourseOverviewPage({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ enroll?: string }> }) {
  const { courseId } = await params;
  const { enroll } = await searchParams;
  const viewer = await requireMember(`/learn/${courseId}`);
  const supabase = await createClient();
  const data = await loadStudentCourse(supabase, courseId, viewer.userId);
  if (!data) notFound();

  const { course, lessons, progress } = data;
  const isMember = Boolean(data.enrolledAt) || data.isStaffPreview;
  const [lock, offerLinks, certRes] = await Promise.all([
    chapterLock(supabase, data, viewer.userId),
    !isMember || data.isLimited
      ? supabase.from("offer_courses").select("access_level, offers(slug, title, payment_type, price_cents, currency, interval, status)").eq("course_id", courseId)
      : Promise.resolve({ data: [] }),
    supabase.from("certificates").select("code").eq("user_id", viewer.userId).eq("course_id", courseId).maybeSingle(),
  ]);
  const offers = ((offerLinks.data ?? []) as unknown as { access_level: string; offers: PublishedOffer | null }[])
    .filter((l) => !data.isLimited || l.access_level === "full")
    .flatMap((l) => (l.offers && l.offers.status === "published" ? [l.offers] : []));

  const next = progress.next ?? lessons[0] ?? null;
  const nextNumber = next ? lessons.findIndex((l) => l.id === next.id) + 1 : 0;
  const totalSeconds = lessons.reduce((sum, l) => sum + (l.duration_seconds ?? 0), 0);
  const hasDrip = lessons.some((l) => (l.available_after_days ?? 0) > 0);
  const dog = viewer.activeDog?.name;

  async function enrollFree() {
    "use server";
    const sb = await createClient();
    // enroll_free() refuses courses that are sold in a paid offer (see review_hardening migration).
    const { error } = await sb.rpc("enroll_free", { p_course_id: courseId });
    if (error) {
      console.error("enroll_free failed", { courseId, error: error.message });
      redirect(`/learn/${courseId}?enroll=failed`);
    }
    redirect(`/learn/${courseId}`);
  }

  const cta = (() => {
    if (!isMember) {
      if (offers.length > 0)
        return offers.map((o) => (
          <Link key={o.slug} className="btn btn-primary" href={`/checkout/${o.slug}`}>
            Get access · {formatOfferPrice(o)}
          </Link>
        ));
      if (course.price === 0)
        return (
          <form action={enrollFree}>
            <button type="submit" className="btn btn-primary">
              <Ms name="play_arrow" fill />
              Start for free
            </button>
          </form>
        );
      return <span className="faint">Enrollment opens soon. Free preview lessons are open below.</span>;
    }
    if (lock.locked) return <span className="pill neutral"><Ms name="lock" size="sm" />Opens after {lock.requiredTitle}</span>;
    if (!next) return null;
    return (
      <Link className="btn btn-primary" href={`/learn/${courseId}/${next.id}`} data-tour="continue">
        <Ms name="play_arrow" fill />
        {progress.completed === 0 ? "Start Lesson 1" : progress.next ? `Continue Lesson ${nextNumber}` : "Watch again"}
      </Link>
    );
  })();

  return (
    <>
      {data.isStaffPreview && (
        <Tip icon="visibility">
          <b>Preview mode.</b> You&apos;re seeing this course as a team member — every lesson is open to you. <Link href={`/admin/courses/${courseId}`} className="link">Back to admin</Link>
        </Tip>
      )}
      <Breadcrumbs items={[{ href: "/my-courses", label: "My Courses" }, { label: course.title }]} />
      <div className="hero">
        <div className="media" style={{ aspectRatio: "16/11" }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- course cover */}
          <img src={course.image || "/app/img/roni-kneel.jpg"} alt={course.imageAlt ?? ""} />
          {isMember && !lock.locked && next && (
            <Link className="play" href={`/learn/${courseId}/${next.id}`} aria-label={`Play ${next.title}`}>
              <Ms name="play_arrow" fill />
            </Link>
          )}
        </div>
        <div className="hero-copy">
          {course.chapterNumber && <span className="eyebrow">Chapter {course.chapterNumber}</span>}
          <h1 className="display" style={{ fontSize: 42 }}>
            {course.title}
          </h1>
          <p className="lede">{course.description}</p>
          <div className="row faint">
            <Ms name="video_library" size="sm" />
            {plural(lessons.length, "lesson")}
            {totalSeconds > 0 && (
              <>
                <span>·</span>
                <Ms name="schedule" size="sm" />
                {formatMinutes(totalSeconds)}
              </>
            )}
            <span>·</span>with Roni Sagi
          </div>
          {isMember && <ProgressLine label="Your progress" value={`${progress.percent}%`} percent={progress.percent} />}
          <div className="row">{cta}</div>
          {enroll === "failed" && (
            <p role="alert" className="faint" style={{ color: "var(--danger)" }}>
              We couldn&apos;t enroll you just now. Please try again.
            </p>
          )}
        </div>
      </div>

      {lock.locked && (
        <Tip icon="lock_clock" warm>
          <b>This chapter opens after {lock.requiredTitle}.</b> Finish every lesson there and {course.title} unlocks here{dog ? ` for you and ${dog}` : ""}.{" "}
          {lock.requiredId && (
            <Link className="link" href={`/learn/${lock.requiredId}`}>
              Go to {lock.requiredTitle}
            </Link>
          )}
        </Tip>
      )}

      {data.isLimited && data.paywallAfterModuleId && (
        <div id="upgrade" className="card" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow">You have limited access</span>
            <h2 className="h3">Unlock the full course</h2>
            <p className="faint">Lessons marked with a lock are part of the full course.</p>
          </div>
          <div className="row">
            {offers.length > 0 ? (
              offers.map((o) => (
                <Link key={o.slug} className="btn btn-primary btn-sm" href={`/checkout/${o.slug}`}>
                  {o.title} · {formatOfferPrice(o)}
                </Link>
              ))
            ) : (
              <Link className="btn btn-ghost btn-sm" href="/help">
                Ask us about upgrading
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid-main">
        <div className="card">
          <div className="card-head">
            <h2 className="h2">Lessons</h2>
            {hasDrip && <span className="faint">New lessons open on a schedule</span>}
          </div>
          {lessons.length === 0 ? <p className="faint">Lessons are being prepared. Check back soon.</p> : <LessonList data={data} locked={lock.locked && isMember} />}
        </div>
        <div className="stack-lg sticky">
          {course.whatYouNeed.length > 0 && (
            <div className="card tight">
              <span className="eyebrow muted">What you&apos;ll need</span>
              <div className="list">
                {course.whatYouNeed.map((n) => (
                  <div key={n.label} className="list-row">
                    <Ms name={n.icon} color="var(--teal)" />
                    <div className="grow">{n.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {course.beforeYouStart && (
            <Tip warm>
              <b>Before you start</b>
              <br />
              {course.beforeYouStart}
            </Tip>
          )}
          {isMember && (
            <Link className="card tight" href={certRes.data ? `/certificates/${certRes.data.code}` : "/progress"} style={{ flexDirection: "row", alignItems: "center" }}>
              <div className="badge" style={{ padding: 0, background: "none", boxShadow: "none" }}>
                <div className="seal" style={{ width: 52, height: 52 }}>
                  <Ms name="workspace_premium" fill />
                </div>
              </div>
              <div>
                <b>Certificate of completion</b>
                <div className="faint">{certRes.data ? "Earned — view and share it" : "Earned when you finish every lesson"}</div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
