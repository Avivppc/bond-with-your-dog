import "server-only";
import { z } from "zod";
import type { OutgoingEmail } from "@/lib/email";
import { canEmail, wantsSessionReminder, type ReminderMember } from "../members";
import { lessonNotice, memberReminderEmail, practiceNotice, sessionNotice, type Notice, type SessionInfo } from "../copy";
import { practiceReminderDue } from "../practice";
import { qaStage, qaWindow, unlockWindow } from "../windows";
import { memberZone } from "../zone";
import { mapInChunks, type DeliveryOutcome } from "../summary";
import { deliver, type Delivery, type Service } from "./data";

/** What a job did: one outcome per delivery attempt, and the emails to send for new ones. */
export interface JobResult {
  outcomes: DeliveryOutcome[];
  emails: OutgoingEmail[];
}

export interface JobContext {
  sb: Service;
  now: Date;
  members: readonly ReminderMember[];
  emailConfigured: boolean;
  siteUrl: string;
}

const CONCURRENCY = 8;

interface Planned {
  member: ReminderMember;
  delivery: Delivery;
  notice: Notice;
  email: boolean;
}

/** Delivers planned reminders a few at a time; emails go only with reminders that were new. */
async function deliverAll(ctx: JobContext, planned: readonly Planned[]): Promise<JobResult> {
  const outcomes = await mapInChunks(planned, CONCURRENCY, (p) => deliver(ctx.sb, p.delivery));
  const emails = planned.flatMap((p, i) =>
    outcomes[i] === "sent" && p.email && p.member.email
      ? [{ to: p.member.email, ...memberReminderEmail(p.member.firstName, p.notice, ctx.siteUrl) }]
      : []
  );
  return { outcomes, emails };
}

/** a. "Today / tomorrow is a practice day" for members who opted in and haven't practiced yet. */
export async function runPracticeJob(ctx: JobContext): Promise<JobResult> {
  const planned = ctx.members.flatMap((member): Planned[] => {
    const target = practiceReminderDue(
      {
        timezone: member.timezone,
        practiceDays: member.practiceDays,
        practicedOn: member.practicedOn,
        hasCourses: member.hasCourses,
        wantsReminders: member.prefs.practice_reminders,
      },
      ctx.now
    );
    if (!target) return [];
    const notice = practiceNotice(target, member.sessionMinutes);
    return [{ member, notice, email: canEmail(member, ctx.emailConfigured), delivery: { userId: member.userId, kind: "practice", ref: target.date, noticeKind: "system", notice } }];
  });
  return deliverAll(ctx, planned);
}

const UnlockRow = z.object({
  user_id: z.string().uuid(),
  lesson_id: z.string().uuid(),
  lesson_title: z.string(),
  course_id: z.string(),
  course_title: z.string(),
});

/** b. "A new lesson is open" for drip lessons that unlocked since the last runs (in-app only). */
export async function runLessonJob(ctx: JobContext): Promise<JobResult> {
  const window = unlockWindow(ctx.now);
  const { data, error } = await ctx.sb.rpc("reminder_lesson_unlocks", { p_since: window.since.toISOString(), p_until: window.until.toISOString() });
  if (error) throw new Error(`reminder_lesson_unlocks failed: ${error.message}`);
  const byId = new Map(ctx.members.map((m) => [m.userId, m]));
  const rows = (Array.isArray(data) ? data : []).flatMap((raw: unknown) => {
    const parsed = UnlockRow.safeParse(raw);
    if (!parsed.success) console.error("[reminders] skipped a malformed unlock row");
    return parsed.success ? [parsed.data] : [];
  });
  const planned = rows.flatMap((row): Planned[] => {
    const member = byId.get(row.user_id);
    if (!member?.prefs.new_lesson) return [];
    const notice = lessonNotice({ lessonId: row.lesson_id, lessonTitle: row.lesson_title, courseId: row.course_id, courseTitle: row.course_title });
    return [{ member, notice, email: false, delivery: { userId: member.userId, kind: "lesson_unlocked", ref: row.lesson_id, noticeKind: "lesson", notice } }];
  });
  return deliverAll(ctx, planned);
}

const SessionRow = z.object({
  id: z.string().uuid(),
  kind: z.enum(["meetup", "live_qa"]),
  title: z.string(),
  starts_at: z.string(),
});

async function loadUpcomingSessions(ctx: JobContext): Promise<{ sessions: SessionInfo[]; rsvps: Set<string> }> {
  const window = qaWindow(ctx.now);
  const { data, error } = await ctx.sb
    .from("community_meetups")
    .select("id, kind, title, starts_at")
    .eq("published", true)
    .eq("canceled", false)
    .gt("starts_at", window.since.toISOString())
    .lte("starts_at", window.until.toISOString())
    .order("starts_at")
    .limit(50);
  if (error) throw new Error(`upcoming sessions failed: ${error.message}`);
  const sessions = (data ?? []).flatMap((raw: unknown) => {
    const parsed = SessionRow.safeParse(raw);
    return parsed.success ? [{ id: parsed.data.id, kind: parsed.data.kind, title: parsed.data.title, startsAt: new Date(parsed.data.starts_at) }] : [];
  });
  const meetupIds = sessions.filter((s) => s.kind === "meetup").map((s) => s.id);
  if (meetupIds.length === 0) return { sessions, rsvps: new Set() };
  const rsvpRes = await ctx.sb.from("community_rsvps").select("meetup_id, user_id").in("meetup_id", meetupIds).limit(10000);
  if (rsvpRes.error) throw new Error(`session RSVPs failed: ${rsvpRes.error.message}`);
  const rsvps = new Set((rsvpRes.data ?? []).map((r) => `${r.meetup_id as string}:${r.user_id as string}`));
  return { sessions, rsvps };
}

/** c. Live Q&A (everyone who wants it) and meetups (those coming): the day before and on the day. */
export async function runSessionJob(ctx: JobContext): Promise<JobResult> {
  const { sessions, rsvps } = await loadUpcomingSessions(ctx);
  const planned = sessions.flatMap((session) => {
    const stage = qaStage(session.startsAt, ctx.now);
    if (!stage) return [];
    return ctx.members.flatMap((member): Planned[] => {
      if (!wantsSessionReminder(member, session.kind, rsvps.has(`${session.id}:${member.userId}`))) return [];
      const notice = sessionNotice(session, stage, ctx.now, memberZone(member.timezone));
      const kind = stage === "day_of" ? "qa_day_of" : "qa_day_before";
      return [{ member, notice, email: canEmail(member, ctx.emailConfigured), delivery: { userId: member.userId, kind, ref: session.id, noticeKind: "event", notice } }];
    });
  });
  return deliverAll(ctx, planned);
}
