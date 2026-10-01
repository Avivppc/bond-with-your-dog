import Link from "next/link";
import { SoonLink } from "@/components/app/SoonLink";
import { ArrowLink, Days, LevelPill, Ms, ProgressLine, formatMinutes } from "@/components/app/ui";
import { LocalTime } from "@/components/ui/LocalTime";
import { TimeAgo } from "@/components/community/bits";
import type { HomeData } from "@/lib/member/home";
import { nextPlanned, weekTally } from "@/lib/member/week";
import { WEEKDAYS } from "@/components/app/ui";
import { plural } from "@/lib/feedback/format";

const FALLBACK_MEDIA = "/app/img/hand-touch.jpg";

export function lessonHref(data: HomeData): string | null {
  return data.current && data.next ? `/learn/${data.current.course.id}/${data.next.id}` : null;
}

export function mediaFor(data: HomeData): string {
  return data.next?.thumbnail_url || data.current?.course.image || FALLBACK_MEDIA;
}

export function WeekCard({ data }: { data: HomeData }) {
  const tally = weekTally(data.week);
  const upcoming = nextPlanned(data.week);
  return (
    <div className="card">
      <div className="card-head">
        <div className="head-block">
          <span className="eyebrow muted">This week</span>
          <h2 className="h3">{tally.target > 0 ? `${tally.done} of ${tally.target} sessions done` : `${plural(tally.done, "session")} so far`}</h2>
        </div>
        <ArrowLink href="/plan">Open plan</ArrowLink>
      </div>
      <Days days={data.week.map((d) => ({ weekday: d.weekday, done: d.done, planned: d.planned, today: d.today, minutes: d.minutes }))} />
      <p className="faint">
        {upcoming
          ? `Next session · ${WEEKDAYS[upcoming.weekday]} · ${upcoming.minutes} min${data.next ? ` · ${data.next.title}` : ""}`
          : "Nothing else planned this week. Add a session from your plan."}
      </p>
    </div>
  );
}

export function RoniCard({ data }: { data: HomeData }) {
  if (!data.feedback) {
    return (
      <div className="card">
        <div className="card-head">
          <div className="row">
            {/* eslint-disable-next-line @next/next/no-img-element -- Roni's portrait */}
            <img className="avatar" src="/app/img/roni.jpg" alt="Roni Sagi" />
            <div>
              <b>Feedback from Roni</b>
              <div className="faint">Roni watches every video members send</div>
            </div>
          </div>
        </div>
        <p className="muted">Film 30–90 seconds of a move you&apos;re working on. Roni replies with notes pinned to moments in your clip.</p>
        <ArrowLink href="/feedback/new">Send your first video</ArrowLink>
      </div>
    );
  }
  const fb = data.feedback;
  return (
    <div className="card">
      <div className="card-head">
        <div className="row">
          {/* eslint-disable-next-line @next/next/no-img-element -- Roni's portrait */}
          <img className="avatar" src="/app/img/roni.jpg" alt="Roni Sagi" />
          <div>
            <b>From Roni</b>
            <div className="faint">
              On your &ldquo;{fb.title}&rdquo; video · <TimeAgo iso={fb.repliedAt} />
            </div>
          </div>
        </div>
        {fb.unread && <span className="pill reliable">New</span>}
      </div>
      {fb.summary && <p className="quote">&ldquo;{fb.summary}&rdquo;</p>}
      <ArrowLink href={`/feedback/${fb.id}`}>View feedback</ArrowLink>
    </div>
  );
}

export function SkillsStrip({ data, dog }: { data: HomeData; dog: string }) {
  if (data.skills.length === 0) {
    if (data.movesCount === 0) return null;
    return (
      <SoonLink className="card flat" href="/moves" style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
        <div className="sketch" style={{ width: 72, height: 72, flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- illustration */}
          <img src="/app/img/intro.jpg" alt="" style={{ width: 62 }} />
        </div>
        <div className="stack" style={{ gap: 4 }}>
          <span className="eyebrow muted">Skills</span>
          <b>{dog}&apos;s moves show up here as you mark them Learning, then Reliable.</b>
          <span className="link">
            Open the Moves Library
            <Ms name="arrow_forward" />
          </span>
        </div>
      </SoonLink>
    );
  }
  return (
    <div className="stack">
      <div className="between">
        <div className="head-block">
          <span className="eyebrow muted">Skills</span>
          <h2 className="h2">{dog}&apos;s moves</h2>
        </div>
        <ArrowLink href="/progress">See all progress</ArrowLink>
      </div>
      <div className="skills-strip">
        {data.skills.slice(0, 8).map((s) => (
          <SoonLink key={s.moveId} className="skill" href={`/moves?move=${s.moveId}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- move image */}
            <img src={s.image || "/app/img/basic-skills.jpg"} alt="" />
            <b>{s.name}</b>
            <LevelPill level={s.level} />
          </SoonLink>
        ))}
      </div>
    </div>
  );
}

export function LiveAndLibrary({ data }: { data: HomeData }) {
  return (
    <div className="grid-7-5">
      {data.liveQa ? (
        <div className="card" style={{ flexDirection: "row", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
          <div className="date-tile">
            <small>
              <LocalTime iso={data.liveQa.startsAt} format="month" />
            </small>
            <b>
              <LocalTime iso={data.liveQa.startsAt} format="day" />
            </b>
          </div>
          <div className="stack" style={{ flex: 1, minWidth: 220, gap: 6 }}>
            <span className="eyebrow muted">Live Q&amp;A with Roni</span>
            <h3 className="h3">
              <LocalTime iso={data.liveQa.startsAt} format="longDateTime" zoneLabel />
            </h3>
            <p className="faint">Send your question ahead and Roni will answer it live.</p>
          </div>
          <div className="row">
            <SoonLink className="btn btn-ghost btn-sm" href="/community#live-qa">
              Send a question
            </SoonLink>
            {data.whatsappUrl && (
              <ArrowLink href={data.whatsappUrl} external>
                WhatsApp group
              </ArrowLink>
            )}
          </div>
        </div>
      ) : (
        <SoonLink className="card" href="/community" style={{ flexDirection: "row", alignItems: "center", gap: 22 }}>
          <div className="sketch" style={{ width: 64, height: 64, background: "var(--teal-soft)", color: "var(--teal)" }}>
            <Ms name="groups" fill />
          </div>
          <div className="stack" style={{ flex: 1, gap: 4 }}>
            <span className="eyebrow muted">Community</span>
            <h3 className="h3">Share a win, ask a quick question</h3>
            <p className="faint">Members and Roni&apos;s team, in one place{data.whatsappUrl ? " — plus the WhatsApp group" : ""}.</p>
          </div>
          <Ms name="arrow_forward" />
        </SoonLink>
      )}
      {data.movesCount > 0 ? (
        <SoonLink className="card flat" href="/moves" style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
          <div className="sketch" style={{ width: 92, height: 92, flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- illustration */}
            <img src="/app/img/drunk-bunny.jpg" alt="" style={{ width: 80 }} />
          </div>
          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow muted">Moves Library</span>
            <b>
              {data.movesCount} {data.movesCount === 1 ? "move" : "moves"}, each with a clip and cue.
            </b>
            <span className="link">
              Browse
              <Ms name="arrow_forward" />
            </span>
          </div>
        </SoonLink>
      ) : (
        <Link className="card flat" href="/help" style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
          <div className="sketch" style={{ width: 92, height: 92, flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- illustration */}
            <img src="/app/img/give-a-hug.jpg" alt="" style={{ width: 80 }} />
          </div>
          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow muted">Help</span>
            <b>How practice, feedback and new lessons work.</b>
            <span className="link">
              Read the guide
              <Ms name="arrow_forward" />
            </span>
          </div>
        </Link>
      )}
    </div>
  );
}

export function CourseProgressLine({ data }: { data: HomeData }) {
  if (!data.current) return null;
  const p = data.current.progress;
  return <ProgressLine label={data.current.course.title} value={`${p.completed} of ${p.total} lessons`} percent={p.percent} />;
}

export function lessonLength(data: HomeData): string | null {
  return formatMinutes(data.next?.duration_seconds);
}
