import Link from "next/link";
import { Dots, Ms, Tip } from "@/components/app/ui";
import { LocalTime } from "@/components/ui/LocalTime";
import type { Dog, SkillLevel } from "@/lib/member/viewer";
import type { AchievementView } from "@/lib/practice/achievements";
import { countWord } from "@/lib/practice/achievements";
import type { CatalogCourseView } from "@/lib/practice/server/catalog";

const AGE: Record<Dog["age_group"], string> = { puppy: "Puppy", adult: "Adult", senior: "Senior" };
const LEVEL_CLASS: Record<SkillLevel, string> = { learning: "l1", reliable: "l2", performance: "l3" };
const LEVEL_LABEL: Record<SkillLevel, string> = { learning: "Learning", reliable: "Reliable", performance: "Performance-ready" };

export function DogHeader({ dog, since, stats }: { dog: Dog; since: string | null; stats: { lessons: number; sessions: number; ready: number } }) {
  const meta = [dog.breed, AGE[dog.age_group], since ? `training since ${since}` : "no sessions logged yet"].filter(Boolean).join(" · ");
  return (
    <div className="card" style={{ flexDirection: "row", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
      {dog.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- member-uploaded dog photo
        <img className="avatar xl" src={dog.photo_url} alt={dog.name} />
      ) : (
        <span className="avatar-initials" style={{ width: 104, height: 104, fontSize: 40 }} aria-hidden>
          {dog.name.charAt(0).toUpperCase()}
        </span>
      )}
      <div className="stack" style={{ gap: 6, flex: 1, minWidth: 220 }}>
        <span className="eyebrow">Progress</span>
        <h1 className="h1">{dog.name}&apos;s journey</h1>
        <p className="muted">{meta}</p>
      </div>
      <div className="row" style={{ gap: 28 }}>
        <div className="stat">
          <b>{stats.lessons}</b>
          <span>Lessons</span>
        </div>
        <div className="stat">
          <b>{stats.sessions}</b>
          <span>Sessions</span>
        </div>
        <div className="stat">
          <b>{stats.ready}</b>
          <span>Moves ready</span>
        </div>
      </div>
    </div>
  );
}

export interface SkillRow {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  image: string;
  level: SkillLevel | null;
}

export function MovesCard({ rows, total }: { rows: SkillRow[]; total: number }) {
  return (
    <div className="card">
      <div className="card-head">
        <h2 className="h2">Moves</h2>
        <div className="row faint" style={{ gap: 14 }} aria-hidden>
          <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "var(--orange)" }} /> Learning</span>
          <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "var(--teal)" }} /> Reliable</span>
          <span><i style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: "var(--gold)" }} /> Performance-ready</span>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="faint">Roni hasn&apos;t published the moves yet. They&apos;ll appear here with your dog&apos;s level on each.</p>
      ) : (
        <div className="list">
          {rows.map((m) => (
            <Link key={m.id} className="skill-track" href={`/moves?move=${m.slug}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- move artwork */}
              <img src={m.image} alt="" />
              <div>
                <b>{m.name}</b>
                <div className="faint">{m.subtitle}</div>
              </div>
              <div className="levels-wrap stack" style={{ gap: 6 }}>
                <div className={`levels ${m.level ? LEVEL_CLASS[m.level] : ""}`} role="img" aria-label={m.level ? LEVEL_LABEL[m.level] : "Not started"}>
                  <i />
                  <i />
                  <i />
                </div>
                <span className="faint">{m.level ? LEVEL_LABEL[m.level] : "Not started"}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
      {total > rows.length && (
        <Link className="link" href="/moves">
          All {total} moves in the library
          <Ms name="arrow_forward" />
        </Link>
      )}
    </div>
  );
}

export function MilestoneCard({ name, slug, sessions, averageReps }: { name: string; slug: string; sessions: number; averageReps: number }) {
  const percent = Math.min(100, (averageReps / 10) * 100);
  return (
    <div className="card tight">
      <span className="eyebrow muted">Next milestone</span>
      <b>{name} to Reliable</b>
      <p className="faint">Roni&apos;s rule: 8 out of 10 clean reps in two different rooms.</p>
      <div className="bar" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label="Average reps per session out of 10">
        <i style={{ width: `${percent}%` }} />
      </div>
      <span className="faint num">
        {sessions === 0 ? "No sessions logged on this move yet" : `${averageReps} of 10 reps on average · ${sessions} ${sessions === 1 ? "session" : "sessions"}`}
      </span>
      <Link className="link" href={`/moves?move=${slug}`}>
        Mark it Reliable when it&apos;s there
        <Ms name="arrow_forward" />
      </Link>
    </div>
  );
}

export function NoMilestoneCard() {
  return (
    <div className="card tight">
      <span className="eyebrow muted">Next milestone</span>
      <b>Pick a move to work on</b>
      <p className="faint">Mark a move as Learning in the Moves Library and it becomes your next milestone.</p>
      <Link className="link" href="/moves">
        Open the Moves Library
        <Ms name="arrow_forward" />
      </Link>
    </div>
  );
}

export function MultiDogTip({ names }: { names: string[] }) {
  const list = names.length === 2 ? `${names[0]} and ${names[1]}` : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  return (
    <Tip icon="sync_alt">
      Training {countWord(names.length)} dogs? Switch between <b>{list}</b> from the dog chip at the top.
    </Tip>
  );
}

export function PathSection({ courses }: { courses: CatalogCourseView[] }) {
  const total = courses.reduce((sum, c) => sum + c.total, 0);
  const numbered = courses.length > 0 && courses.every((c) => c.chapterNumber !== null);
  const unit = numbered ? (courses.length === 1 ? "chapter" : "chapters") : courses.length === 1 ? "course" : "courses";
  return (
    <div className="stack">
      <div className="head-block">
        <span className="eyebrow muted">The path</span>
        <h2 className="h2">{courses.length === 0 ? "Your path starts with a course" : `${total} ${total === 1 ? "lesson" : "lessons"}, ${countWord(courses.length)} ${unit}`}</h2>
      </div>
      {courses.length === 0 ? (
        <Link className="btn btn-primary" href="/my-courses" style={{ alignSelf: "flex-start" }}>
          Go to My Courses
        </Link>
      ) : (
        <div className="journey">
          {courses.map((c) => (
            <Link key={c.id} className="chapter" href={`/learn/${c.id}`}>
              <div className="sketch">
                {/* eslint-disable-next-line @next/next/no-img-element -- course artwork */}
                <img src={c.image ?? "/app/img/basic-foundations.jpg"} alt="" />
              </div>
              <div className="between">
                <b>{c.title}</b>
                <span className="faint num">
                  {c.completed} / {c.total}
                </span>
              </div>
              {c.total > 0 && <Dots total={c.total} done={c.completed} />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function AchievementsSection({ items }: { items: AchievementView[] }) {
  return (
    <div className="stack">
      <div className="head-block">
        <span className="eyebrow muted">Milestones</span>
        <h2 className="h2">Achievements</h2>
      </div>
      <div className="badges">
        {items.map((a) => (
          <div key={a.code} className={`badge ${a.earnedAt ? "" : "locked"}`} title={a.description}>
            <div className="seal">
              <Ms name={a.icon} fill={Boolean(a.earnedAt)} />
            </div>
            <b>{a.title}</b>
            <span className="faint">{a.earnedAt ? <LocalTime iso={a.earnedAt} format="shortDate" /> : a.hint}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
