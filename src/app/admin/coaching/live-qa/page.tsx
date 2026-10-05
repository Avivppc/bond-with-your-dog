import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { LocalTime } from "@/components/ui/LocalTime";
import { Card, EmptyState, Notice, PageHeader, StatusPill } from "@/app/admin/_components/ui";
import { MeetupForm, type MeetupRecord } from "@/app/admin/community/MeetupForm";
import { loadMembers, MemberLink, type MemberInfo } from "../members";
import { setQaQuestionAnswered } from "./actions";

export const metadata = { title: "Live Q&A" };

export const dynamic = "force-dynamic";

const SESSIONS_SHOWN = 100;

interface QaQuestion {
  id: string;
  meetup_id: string;
  user_id: string;
  body: string;
  answered: boolean;
  created_at: string;
}

interface LiveQaData {
  upcoming: MeetupRecord[];
  past: MeetupRecord[];
  questions: QaQuestion[];
  rsvps: { meetup_id: string }[];
  members: Map<string, MemberInfo>;
}

/** Live Q&A sessions (upcoming soonest first, past newest first) with their questions and RSVPs. */
async function loadLiveQa(): Promise<LiveQaData> {
  const sb = createServiceClient();

  const { data: sessionData, error: loadError } = await sb
    .from("community_meetups")
    .select("id, kind, title, description, starts_at, duration_minutes, location, meeting_url, cover_image_url, published, canceled, recording_url, recording_minutes, recording_chapters")
    .eq("kind", "live_qa")
    .order("starts_at", { ascending: false })
    .limit(SESSIONS_SHOWN);
  if (loadError) console.error("[admin/coaching] live Q&A load failed", loadError.message);
  const sessions = (sessionData ?? []) as MeetupRecord[];
  const ids = sessions.map((s) => s.id);

  const [questionsRes, rsvpsRes] = ids.length
    ? await Promise.all([
        sb.from("qa_questions").select("id, meetup_id, user_id, body, answered, created_at").in("meetup_id", ids).order("created_at"),
        sb.from("community_rsvps").select("meetup_id").in("meetup_id", ids),
      ])
    : [null, null];
  if (questionsRes?.error) console.error("[admin/coaching] qa questions load failed", questionsRes.error.message);
  const questions = (questionsRes?.data ?? []) as QaQuestion[];
  const rsvps = (rsvpsRes?.data ?? []) as { meetup_id: string }[];
  const members = await loadMembers(questions.map((q) => q.user_id));

  const now = Date.now();
  return {
    upcoming: sessions.filter((s) => new Date(s.starts_at).getTime() >= now).reverse(),
    past: sessions.filter((s) => new Date(s.starts_at).getTime() < now),
    questions,
    rsvps,
    members,
  };
}

export default async function LiveQaPage({ searchParams }: { searchParams: Promise<{ open?: string; saved?: string; error?: string }> }) {
  await requireStaff("content");
  const { open, saved, error } = await searchParams;
  const { upcoming, past, questions, rsvps, members } = await loadLiveQa();
  const pastIds = new Set(past.map((s) => s.id));
  const section =(title: string, list: MeetupRecord[], empty: string) => (
    <Card flush title={title}>
      {list.length === 0 ? (
        <EmptyState title={empty} />
      ) : (
        <ul className="divide-y divide-[#efeeed] border-t border-[#efeeed]">
          {list.map((s) => (
            <SessionItem
              key={s.id}
              session={s}
              questions={questions.filter((q) => q.meetup_id === s.id)}
              going={rsvps.filter((r) => r.meetup_id === s.id).length}
              members={members}
              isOpen={open === s.id}
              isPast={pastIds.has(s.id)}
            />
          ))}
        </ul>
      )}
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Live Q&A" description="Seasonal live sessions with Roni: members send questions ahead and watch the recording afterwards." />
      {saved && <Notice tone="success">Saved.</Notice>}
      {error && <Notice tone="error">{error}</Notice>}
      {section("Upcoming", upcoming, "No upcoming Live Q&A. Schedule one below.")}
      {section("Past sessions", past, "No past sessions yet.")}
      <Card title="New Live Q&A" description="Members can send questions ahead until it starts. Add the recording once it has happened.">
        <MeetupForm returnTo="live-qa" />
      </Card>
    </div>
  );
}

interface SessionItemProps {
  session: MeetupRecord;
  questions: readonly QaQuestion[];
  going: number;
  members: Map<string, MemberInfo>;
  isOpen: boolean;
  isPast: boolean;
}

function SessionItem({ session: s, questions, going, members, isOpen, isPast }: SessionItemProps) {
  const openCount = questions.filter((q) => !q.answered).length;
  return (
    <li id={`session-${s.id}`}>
      <details open={isOpen}>
        <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-3">
          <span className="font-medium">{s.title}</span>
          <span className="flex flex-wrap items-center gap-2 text-xs text-[#6c6a69]">
            <LocalTime iso={s.starts_at} format="dateTime" zoneLabel />
            <span>
              · {questions.length} {questions.length === 1 ? "question" : "questions"} ({openCount} open) · {going} going
            </span>
            {isPast && <StatusPill tone={s.recording_url ? "info" : "warning"}>{s.recording_url ? "Recording added" : "No recording yet"}</StatusPill>}
            {s.canceled ? <StatusPill tone="danger">Canceled</StatusPill> : <StatusPill tone={s.published ? "published" : "draft"}>{s.published ? "Published" : "Draft"}</StatusPill>}
          </span>
        </summary>
        <div className="grid gap-6 border-t border-[#efeeed] bg-[#fafaf9] p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="min-w-0 space-y-3">
            <h3 className="text-sm font-semibold">Questions sent ahead</h3>
            {questions.length === 0 ? (
              <p className="text-sm text-[#6c6a69]">No questions yet.</p>
            ) : (
              <ul className="space-y-2">
                {questions.map((q) => (
                  <QuestionRow key={q.id} question={q} member={members.get(q.user_id)} />
                ))}
              </ul>
            )}
          </section>
          <section className="min-w-0 space-y-3">
            <h3 className="text-sm font-semibold">Session details</h3>
            <MeetupForm meetup={s} returnTo="live-qa" />
          </section>
        </div>
      </details>
    </li>
  );
}

function QuestionRow({ question: q, member }: { question: QaQuestion; member: MemberInfo | undefined }) {
  return (
    <li className={`rounded-[12px] border border-[#e7e6e4] bg-white p-3 ${q.answered ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3 text-sm">
        <MemberLink member={member} />
        <span className="shrink-0 text-xs text-[#6c6a69]">
          <LocalTime iso={q.created_at} format="shortDate" />
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-[#1a1a19]">{q.body}</p>
      <form action={setQaQuestionAnswered} className="mt-2">
        <input type="hidden" name="id" value={q.id} />
        <input type="hidden" name="meetup_id" value={q.meetup_id} />
        <input type="hidden" name="answered" value={q.answered ? "false" : "true"} />
        <button type="submit" className="inline-flex items-center gap-1 text-xs font-medium text-[#6c6a69] hover:text-[#1a1a19]">
          <span className="material-symbols-outlined text-[16px]" aria-hidden>
            {q.answered ? "undo" : "check_circle"}
          </span>
          {q.answered ? "Mark as open" : "Mark answered"}
        </button>
      </form>
    </li>
  );
}
