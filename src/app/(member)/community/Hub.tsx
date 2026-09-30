import Link from "next/link";
import type { CommunityContext } from "@/lib/community/context";
import { ArrowLink, Ms } from "@/components/app/ui";
import { LocalTime } from "@/components/ui/LocalTime";
import { QaQuestionForm, StoryForm } from "./HubForms";

interface QaSession {
  id: string;
  title: string;
  starts_at: string;
  duration_minutes: number;
  recording_url: string | null;
  recording_minutes: number | null;
  cover_image_url: string | null;
}

const RECORDING_IMAGES = ["/app/img/pack.jpg", "/app/img/walk.jpg", "/app/img/serafina.jpg"];

/** The design's community hub: WhatsApp group, the next Live Q&A, past recordings, Bonded Stories. */
export async function Hub({ ctx, whatsappUrl, dogName }: { ctx: CommunityContext; whatsappUrl: string | null; dogName: string | null }) {
  const nowIso = new Date().toISOString();
  const [nextRes, pastRes] = await Promise.all([
    ctx.supabase
      .from("community_meetups")
      .select("id, title, starts_at, duration_minutes, recording_url, recording_minutes, cover_image_url")
      .eq("kind", "live_qa")
      .eq("canceled", false)
      .gte("starts_at", nowIso)
      .order("starts_at")
      .limit(1),
    ctx.supabase
      .from("community_meetups")
      .select("id, title, starts_at, duration_minutes, recording_url, recording_minutes, cover_image_url")
      .eq("kind", "live_qa")
      .not("recording_url", "is", null)
      .lt("starts_at", nowIso)
      .order("starts_at", { ascending: false })
      .limit(6),
  ]);
  const next = (nextRes.data?.[0] ?? null) as QaSession | null;
  const past = (pastRes.data ?? []) as QaSession[];

  return (
    <>
      <div className="community-hero">
        {/* eslint-disable-next-line @next/next/no-img-element -- Roni with her dogs */}
        <img src={ctx.settings?.cover_image_url || "/app/img/steps.jpg"} alt="Roni sitting on steps with her Border Collies" />
        <div className="copy">
          <span className="eyebrow">Community</span>
          <h1 className="display" style={{ color: "#fff" }}>
            You&apos;re training
            <br />
            with good company.
          </h1>
          <p style={{ color: "#e6f1f5" }}>{ctx.settings?.description || "Share wins, ask questions and join a live Q&A with Roni."}</p>
        </div>
      </div>

      <div className="grid-2" id="live-qa">
        {whatsappUrl ? (
          <div className="card">
            <div className="row">
              <div className="sketch" style={{ width: 52, height: 52, background: "#e3f7ea", color: "#1c7a43" }}>
                <Ms name="forum" fill />
              </div>
              <div>
                <span className="eyebrow muted">WhatsApp</span>
                <h2 className="h3">Bonded Members</h2>
              </div>
            </div>
            <p className="muted">Share wins, ask quick questions and see what other dogs are working on. Roni&apos;s team drops in most days.</p>
            <div className="row">
              <a className="btn btn-ghost btn-sm" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <Ms name="open_in_new" size="sm" />
                Open the group
              </a>
              <span className="faint">Community guidelines apply</span>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="row">
              <div className="sketch" style={{ width: 52, height: 52, background: "var(--teal-soft)", color: "var(--teal)" }}>
                <Ms name="forum" fill />
              </div>
              <div>
                <span className="eyebrow muted">Right here</span>
                <h2 className="h3">The member feed</h2>
              </div>
            </div>
            <p className="muted">Post a win or a question below. Roni&apos;s team reads the feed every day.</p>
            <ArrowLink href="#feed">Go to the feed</ArrowLink>
          </div>
        )}
        {next ? (
          <div className="card">
            <div className="row">
              <div className="date-tile">
                <small>
                  <LocalTime iso={next.starts_at} format="month" />
                </small>
                <b>
                  <LocalTime iso={next.starts_at} format="day" />
                </b>
              </div>
              <div>
                <span className="eyebrow muted">Next live Q&amp;A</span>
                <h2 className="h3">{next.title}</h2>
                <div className="faint">
                  <LocalTime iso={next.starts_at} format="weekdayTime" zoneLabel /> · {next.duration_minutes} min
                </div>
              </div>
            </div>
            <QaQuestionForm meetupId={next.id} calendarHref={`/community/meetups/${next.id}/calendar`} />
          </div>
        ) : (
          <div className="card">
            <span className="eyebrow muted">Live Q&amp;A</span>
            <h2 className="h3">The next session will be announced here</h2>
            <p className="faint">Roni runs a live Q&amp;A every season. You&apos;ll get a notification when the date is set.</p>
            <ArrowLink href="/community/meetups">See all meetups</ArrowLink>
          </div>
        )}
      </div>

      <div className="grid-7-5">
        <div className="card">
          <div className="card-head">
            <h2 className="h3">Past Q&amp;A recordings</h2>
            <span className="faint">Members only</span>
          </div>
          {past.length === 0 ? (
            <p className="faint">Recordings of past sessions will appear here.</p>
          ) : (
            <div className="list">
              {past.map((q, i) => (
                <a key={q.id} className="list-row" href={q.recording_url!} target="_blank" rel="noopener noreferrer">
                  <div className="media" style={{ width: 112, aspectRatio: "16/10", borderRadius: 12, flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- session cover */}
                    <img src={q.cover_image_url || RECORDING_IMAGES[i % RECORDING_IMAGES.length]} alt="" />
                  </div>
                  <div className="grow">
                    <div className="title">{q.title}</div>
                    <div className="faint">
                      <LocalTime iso={q.starts_at} format="monthYear" />
                      {q.recording_minutes ? ` · ${q.recording_minutes} min` : ""}
                    </div>
                  </div>
                  <Ms name="play_circle" color="var(--teal)" />
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="card" style={{ background: "var(--ink)", color: "#eaf6fb" }}>
          <span className="eyebrow" style={{ color: "#ffd59a" }}>
            Bonded Stories
          </span>
          <h2 className="h2" style={{ color: "#fff" }}>
            Share how you{dogName ? ` and ${dogName}` : ""} changed
          </h2>
          <p style={{ color: "#bcd0d8" }}>Your story might appear on the Bonded site, with your permission. Roni reads every one.</p>
          <StoryForm />
        </div>
      </div>
      <div className="between" id="feed" style={{ alignItems: "center" }}>
        <div className="head-block">
          <span className="eyebrow muted">Member feed</span>
          <h2 className="h2">What everyone&apos;s working on</h2>
        </div>
        <Link className="link" href="/community/members">
          Members
          <Ms name="arrow_forward" />
        </Link>
      </div>
    </>
  );
}
