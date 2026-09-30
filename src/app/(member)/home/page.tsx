import Link from "next/link";
import { redirect } from "next/navigation";
import { dogName, requireMember, type MemberViewer } from "@/lib/member/viewer";
import { loadHome, type HomeData } from "@/lib/member/home";
import { ArrowLink, Days, Ms } from "@/components/app/ui";
import { WEEKDAYS } from "@/components/app/ui";
import { CourseProgressLine, LiveAndLibrary, RoniCard, SkillsStrip, WeekCard, lessonHref, lessonLength, mediaFor } from "./sections";

export const dynamic = "force-dynamic";
export const metadata = { title: "Home" };

function greetingName(viewer: MemberViewer): React.ReactNode {
  return viewer.activeDog ? `${viewer.firstName} & ${viewer.activeDog.name}` : viewer.firstName;
}

function returningLede(data: HomeData, dog: string): string {
  const next = data.next;
  if (data.current && !data.current.progress.next) {
    return `You've finished every lesson in ${data.current.course.title}. Rewatch a favourite, or keep ${dog}'s moves sharp in practice.`;
  }
  if (data.lastPractice && next) {
    const day = WEEKDAYS[new Date(`${data.lastPractice.practicedOn}T12:00:00`).getDay()];
    const what = data.lastPractice.moveName ?? data.lastPractice.lessonTitle;
    return `You and ${dog} last practised${what ? ` ${what}` : ""} on ${day}${data.lastPractice.minutes ? ` for ${data.lastPractice.minutes} min` : ""}. Today you'll carry on with “${next.title}”.`;
  }
  return next ? `Pick up where you left off: “${next.title}”${lessonLength(data) ? `, ${lessonLength(data)} with Roni` : ""}.` : "Your course is being prepared. Check back soon.";
}

export default async function HomePage() {
  const viewer = await requireMember("/home");
  if (!viewer.profile.onboarded_at) redirect("/welcome");
  const data = await loadHome(viewer);
  const dog = dogName(viewer);

  if (!data.current) return <NoCourseHome viewer={viewer} />;
  if (data.dayOne) return <DayOneHome viewer={viewer} data={data} dog={dog} />;

  const href = lessonHref(data);
  const total = data.current.lessons.length;
  return (
    <>
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

function DayOneHome({ viewer, data, dog }: { viewer: MemberViewer; data: HomeData; dog: string }) {
  const href = lessonHref(data);
  const first = data.current!.lessons[0];
  const plannedDays = viewer.profile.practice_days;
  return (
    <>
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
            <Link className="list-row" href="/community">
              <span className="num-step" style={{ background: "var(--tint-2)", color: "var(--ink-2)" }}>
                3
              </span>
              <div className="grow">
                <div className="title">Say hi in the community</div>
                <div className="faint">Meet the other members{data.whatsappUrl ? " (and the WhatsApp group)" : ""}</div>
              </div>
            </Link>
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

function NoCourseHome({ viewer }: { viewer: MemberViewer }) {
  return (
    <>
      <div className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Welcome</span>
          <h1 className="display">
            Welcome to Bonded,
            <br />
            <em>{greetingName(viewer)}</em>
          </h1>
          <p className="lede">Three chapters, one partnership: Foundations, Moves and Let&apos;s Dance. Choose where to begin and your first lesson will be waiting here.</p>
          <div className="row" style={{ gap: 20 }}>
            <Link className="btn btn-primary" href="/my-courses">
              <Ms name="school" />
              Choose your course
            </Link>
            <ArrowLink href="/community">Visit the community</ArrowLink>
          </div>
        </div>
        <div className="media">
          {/* eslint-disable-next-line @next/next/no-img-element -- Roni with her dogs */}
          <img src="/app/img/roni-kneel.jpg" alt="Roni kneeling with her two Border Collies" />
        </div>
      </div>
    </>
  );
}
