import Link from "next/link";
import { SoonLink } from "@/components/app/SoonLink";
import { redirect } from "next/navigation";
import { dogName, requireMember, type MemberViewer } from "@/lib/member/viewer";
import { loadHome, type HomeData } from "@/lib/member/home";
import { loadMyCourses } from "@/lib/member/courses";
import { chapterChoices, defaultChoiceId, toCourseChoice, unlockLabel, unlockSentence, type CourseChoice } from "@/lib/member/course-choice";
import { ArrowLink, Days, Ms } from "@/components/app/ui";
import { WEEKDAYS } from "@/components/app/ui";
import { VerifyEmailNotice } from "./VerifyEmailNotice";
import { CourseProgressLine, LiveAndLibrary, RoniCard, SkillsStrip, WeekCard, lessonHref, lessonLength, mediaFor } from "./sections";

export const dynamic = "force-dynamic";
export const metadata = { title: "Home" };

function greetingName(viewer: MemberViewer): React.ReactNode {
  return viewer.activeDog ? `${viewer.firstName} & ${viewer.activeDog.name}` : viewer.firstName;
}

function returningLede(data: HomeData, dog: string): string {
  const next = data.next;
  if (data.current && !data.current.progress.next) {
    return `You've finished every lesson in ${data.current.course.title}. Rewatch a favorite, or keep ${dog}'s moves sharp in practice.`;
  }
  if (data.lastPractice && next) {
    const day = WEEKDAYS[new Date(`${data.lastPractice.practicedOn}T12:00:00`).getDay()];
    const what = data.lastPractice.moveName ?? data.lastPractice.lessonTitle;
    return `You and ${dog} last practiced${what ? ` ${what}` : ""} on ${day}${data.lastPractice.minutes ? ` for ${data.lastPractice.minutes} min` : ""}. Today you'll carry on with “${next.title}”.`;
  }
  return next ? `Pick up where you left off: “${next.title}”${lessonLength(data) ? `, ${lessonLength(data)} with Roni` : ""}.` : "Your course is being prepared. Check back soon.";
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ verified?: string; verify?: string }> }) {
  const viewer = await requireMember("/home");
  if (!viewer.profile.onboarded_at) redirect("/welcome");
  const { verified, verify } = await searchParams;
  const data = await loadHome(viewer);
  const dog = dogName(viewer);
  const notice = <EmailNotice viewer={viewer} justVerified={verified === "1"} expired={verify === "expired"} />;

  if (!data.current) return <NoCourseHome viewer={viewer} notice={notice} chosen={await chosenCourse(viewer)} />;
  if (data.dayOne) return <DayOneHome viewer={viewer} data={data} dog={dog} notice={notice} />;

  const href = lessonHref(data);
  const total = data.current.lessons.length;
  return (
    <>
      {notice}
      <div className="hero" data-tour="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">
            {data.current.course.title}
            {data.nextNumber > 0 ? ` · Lesson ${data.nextNumber} of ${total}` : ""}
          </span>
          <h1 className="display">
            Welcome back,
            <br />
            <em>{greetingName(viewer)}</em>
          </h1>
          <p className="lede">{returningLede(data, dog)}</p>
          <CourseProgressLine data={data} />
          <div className="row" style={{ gap: 20 }}>
            {href && (
              <Link className="btn btn-primary" href={href} data-tour="continue">
                <Ms name="play_arrow" fill />
                {data.current.progress.next ? `Continue Lesson ${data.nextNumber}` : "Watch again"}
              </Link>
            )}
            <ArrowLink href={data.next ? `/practice?lesson=${data.next.id}` : "/practice"}>Start today&apos;s practice</ArrowLink>
          </div>
        </div>
        <div className="media">
          {/* eslint-disable-next-line @next/next/no-img-element -- lesson or course image */}
          <img src={mediaFor(data)} alt="" />
          {data.next && (
            <div className="glass">
              <Ms name="play_circle" fill color="var(--cognac)" />
              <div>
                <b>Up next · {data.next.title}</b>
                <div className="faint">{lessonLength(data) ? `${lessonLength(data)} with Roni Sagi` : "with Roni Sagi"}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2" data-tour="week">
        <WeekCard data={data} />
        <RoniCard data={data} />
      </div>

      <SkillsStrip data={data} dog={dog} />
      <LiveAndLibrary data={data} />
    </>
  );
}

function DayOneHome({ viewer, data, dog, notice }: { viewer: MemberViewer; data: HomeData; dog: string; notice: React.ReactNode }) {
  const href = lessonHref(data);
  const first = data.current!.lessons[0];
  const plannedDays = viewer.profile.practice_days;
  return (
    <>
      {notice}
      <div className="hero" data-tour="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">Day 1 · {data.current!.course.title}</span>
          <h1 className="display">
            Welcome to Bonded,
            <br />
            <em>{greetingName(viewer)}</em>
          </h1>
          <p className="lede">
            {lessonLength(data) ? `Your first lesson is ${lessonLength(data)}. ` : ""}Watch it together, then try a five-minute session with {dog} while it&apos;s fresh.
          </p>
          <div className="row" style={{ gap: 20 }}>
            {href && (
              <Link className="btn btn-primary" href={href} data-tour="continue">
                <Ms name="play_arrow" fill />
                Start Lesson 1
              </Link>
            )}
            <ArrowLink href={`/learn/${data.current!.course.id}`}>See all {data.current!.lessons.length} lessons</ArrowLink>
          </div>
        </div>
        <div className="media">
          {/* eslint-disable-next-line @next/next/no-img-element -- lesson or course image */}
          <img src={data.next?.thumbnail_url || data.current!.course.image || "/app/img/roni-kneel.jpg"} alt="" />
          {href && (
            <Link className="play" href={href} aria-label="Play the first lesson">
              <Ms name="play_arrow" fill />
            </Link>
          )}
        </div>
      </div>
      <div className="grid-3" data-tour="week">
        <div className="card">
          <span className="eyebrow muted">Your first week</span>
          <div className="list">
            <Link className="list-row" href={href ?? `/learn/${data.current!.course.id}`}>
              <span className="num-step">1</span>
              <div className="grow">
                <div className="title">Watch Lesson 1</div>
                <div className="faint">
                  {first?.title}
                  {lessonLength(data) ? ` · ${lessonLength(data)}` : ""}
                </div>
              </div>
            </Link>
            <Link className="list-row" href={first ? `/practice?lesson=${first.id}` : "/practice"}>
              <span className="num-step" style={{ background: "var(--tint-2)", color: "var(--ink-2)" }}>
                2
              </span>
              <div className="grow">
                <div className="title">First 5-minute practice</div>
                <div className="faint">We&apos;ll guide you step by step</div>
              </div>
            </Link>
            <SoonLink className="list-row" href="/community">
              <span className="num-step" style={{ background: "var(--tint-2)", color: "var(--ink-2)" }}>
                3
              </span>
              <div className="grow">
                <div className="title">Say hi in the community</div>
                <div className="faint">Meet the other members{data.whatsappUrl ? " (and the WhatsApp group)" : ""}</div>
              </div>
            </SoonLink>
          </div>
        </div>
        <div className="card">
          <span className="eyebrow muted">Your plan</span>
          <h3 className="h3">
            {plannedDays.length > 0 ? plannedDays.map((d) => WEEKDAYS[d]).join(", ") : "No days picked yet"}
            <br />
            {viewer.profile.session_minutes} minutes each
          </h3>
          <Days days={plannedDays.map((d) => ({ weekday: d, planned: true, minutes: viewer.profile.session_minutes }))} />
          <ArrowLink href="/plan">Change days</ArrowLink>
        </div>
        <div className="card" style={{ alignItems: "center", textAlign: "center" }}>
          <div className="sketch" style={{ width: 120, height: 120 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- illustration */}
            <img src="/app/img/intro.jpg" alt="" style={{ width: 104 }} />
          </div>
          <h3 className="h3">{viewer.activeDog ? `${viewer.activeDog.name}'s` : "Your dog's"} skills show up here</h3>
          <p className="faint">After your first practice you&apos;ll see each move grow from Learning to Performance-ready.</p>
        </div>
      </div>
    </>
  );
}

/** Confirm-your-email reminder, or a thank-you right after the link was opened. */
function EmailNotice({ viewer, justVerified, expired }: { viewer: MemberViewer; justVerified: boolean; expired: boolean }) {
  if (viewer.emailVerified) {
    return justVerified ? (
      <p className="tip" role="status">
        <Ms name="verified" />
        <span>Thanks, your email is confirmed.</span>
      </p>
    ) : null;
  }
  return <VerifyEmailNotice email={viewer.email} expired={expired} />;
}

/** The chapter picked in onboarding, for members who don't own a course yet. */
async function chosenCourse(viewer: MemberViewer): Promise<CourseChoice | null> {
  const { cards } = await loadMyCourses(viewer.userId);
  const choices = chapterChoices(cards.map(toCourseChoice));
  const id = defaultChoiceId(choices, viewer.profile.chosen_course_id);
  return choices.find((c) => c.id === id) ?? null;
}

function NoCourseHome({ viewer, notice, chosen }: { viewer: MemberViewer; notice: React.ReactNode; chosen: CourseChoice | null }) {
  return (
    <>
      {notice}
      <div className="hero">
        <div className="hero-copy">
          <span className="eyebrow">{chosen ? `Your path · ${chosen.title}` : "Welcome"}</span>
          <h1 className="display">
            Welcome to Bonded,
            <br />
            <em>{greetingName(viewer)}</em>
          </h1>
          <p className="lede">
            {chosen
              ? `You chose to begin with ${chosen.title}. ${unlockSentence(chosen.offer)}`
              : "Three chapters, one partnership: Foundations, Moves and Let's Dance. Choose where to begin and your first lesson will be waiting here."}
          </p>
          <div className="row" style={{ gap: 20 }}>
            {chosen?.offer ? (
              <>
                <Link className="btn btn-primary" href={`/checkout/${chosen.offer.slug}`}>
                  <Ms name="lock_open" />
                  {unlockLabel(chosen.offer)}
                </Link>
                <ArrowLink href="/my-courses">See all chapters</ArrowLink>
              </>
            ) : (
              <Link className="btn btn-primary" href="/my-courses">
                <Ms name="school" />
                Choose your chapter
              </Link>
            )}
          </div>
        </div>
        <div className="media">
          {/* eslint-disable-next-line @next/next/no-img-element -- course image or Roni with her dogs */}
          <img src={chosen?.image || "/app/img/roni-kneel.jpg"} alt={chosen ? "" : "Roni kneeling with her two Border Collies"} />
        </div>
      </div>
    </>
  );
}
