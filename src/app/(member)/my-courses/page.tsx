import Link from "next/link";
import { requireMember } from "@/lib/member/viewer";
import { loadMyCourses, type CourseCardData } from "@/lib/member/courses";
import { STATUS_LABEL } from "@/lib/member/course-status";
import { Ms, Ring } from "@/components/app/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "My Courses" };

const FALLBACK = ["/app/img/hand-touch.jpg", "/app/img/stairs-jump.jpg", "/app/img/agt.jpg"];

function StatusPill({ card }: { card: CourseCardData }) {
  if (card.status === "locked") {
    return (
      <span className="pill neutral">
        <Ms name="lock" size="sm" />
        Opens after {card.lockedByTitle}
      </span>
    );
  }
  const tone = card.status === "in_progress" ? "learning" : card.status === "completed" ? "reliable" : "neutral";
  return <span className={`pill ${tone}`}>{STATUS_LABEL[card.status]}</span>;
}

function CardBody({ card }: { card: CourseCardData }) {
  const c = card.course;
  const next = c?.progress.next ?? c?.lessons[0] ?? null;
  const nextNumber = next && c ? c.lessons.findIndex((l) => l.id === next.id) + 1 : 0;
  return (
    <div className="body">
      <div className="row">
        {card.chapterNumber && <span className="eyebrow">Chapter {card.chapterNumber}</span>}
        <StatusPill card={card} />
      </div>
      <h2 className="h1" style={{ fontSize: 32 }}>
        {card.title}
      </h2>
      <p className="muted">{card.description}</p>
      {c && (card.status === "in_progress" || card.status === "not_started" || card.status === "completed") && (
        <>
          <div className="row" style={{ gap: 18 }}>
            <Ring percent={c.progress.percent} size={64} />
            <div>
              <b>{card.status === "completed" ? "Every lesson complete" : next ? `Lesson ${nextNumber} · ${next.title}` : "Lessons are being prepared"}</b>
              <div className="faint">
                {c.progress.total} lessons · {c.progress.completed} complete
              </div>
            </div>
          </div>
          <div>
            <span className="btn btn-primary">{card.status === "completed" ? "Watch again" : card.status === "not_started" ? "Start" : "Continue"}</span>
          </div>
        </>
      )}
      {card.status === "locked" && (
        <>
          {card.moveNames.length > 0 && (
            <div className="row">
              {card.moveNames.map((m) => (
                <span key={m} className="chip">
                  {m}
                </span>
              ))}
            </div>
          )}
          <span className="link">
            Preview the chapter
            <Ms name="arrow_forward" />
          </span>
        </>
      )}
      {card.status === "not_owned" && (
        <div className="row">
          {card.offers.length > 0 ? (
            card.offers.slice(0, 2).map((o) => (
              <span key={o.slug} className="btn btn-ghost btn-sm">
                {o.title} · {o.price}
              </span>
            ))
          ) : (
            <span className="btn btn-ghost btn-sm">Learn more</span>
          )}
        </div>
      )}
    </div>
  );
}

function hrefFor(card: CourseCardData): string {
  if (card.status === "not_owned" && card.offers[0]) return `/checkout/${card.offers[0].slug}`;
  const c = card.course;
  const next = c?.progress.next;
  if (c && next && (card.status === "in_progress" || card.status === "not_started")) return `/learn/${card.id}/${next.id}`;
  return `/learn/${card.id}`;
}

export default async function MyCoursesPage() {
  const viewer = await requireMember("/my-courses");
  const { cards, certificates } = await loadMyCourses(viewer.userId);
  const owned = cards.filter((c) => c.status !== "not_owned").length;
  const firstUnfinished = cards.find((c) => c.status === "in_progress" || c.status === "not_started");

  return (
    <>
      <div className="head-block">
        <span className="eyebrow">Your journey</span>
        <h1 className="h1">My Courses</h1>
        <p className="lede">{cards.length > 1 ? `${cards.length} chapters, one partnership. Each builds on the last.` : "Your training, one step at a time."}</p>
      </div>

      {cards.length === 0 && (
        <div className="card state-card">
          <div className="big-ic">
            <Ms name="school" />
          </div>
          <span className="eyebrow muted">Coming soon</span>
          <h2 className="h3">Courses are being prepared</h2>
          <p className="faint">Roni is putting the finishing touches on the lessons. You&apos;ll find them here.</p>
        </div>
      )}

      {cards.map((card, i) => (
        <Link key={card.id} className={`course-card ${card.status === "not_owned" ? "dim" : ""}`} href={hrefFor(card)} data-tour={i === 0 ? "course-card" : undefined}>
          <div className="media">
            {/* eslint-disable-next-line @next/next/no-img-element -- course cover */}
            <img src={card.image || FALLBACK[i % FALLBACK.length]} alt="" />
          </div>
          <CardBody card={card} />
        </Link>
      ))}

      {owned > 0 && (
        <Link className="card flat" href={certificates[0] ? `/certificates/${certificates[0].code}` : "/progress"} style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
          <div className="badge" style={{ padding: 0, background: "none", boxShadow: "none" }}>
            <div className="seal">
              <Ms name="workspace_premium" fill />
            </div>
          </div>
          <div className="grow" style={{ flex: 1 }}>
            <b>Certificates</b>
            <div className="faint">
              {certificates.length} of {owned} earned
              {certificates.length < owned && firstUnfinished ? ` · the next arrives when you finish ${firstUnfinished.title}` : ""}
            </div>
          </div>
          <span className="link">
            {certificates[0] ? "View" : "See progress"}
            <Ms name="arrow_forward" />
          </span>
        </Link>
      )}
    </>
  );
}
