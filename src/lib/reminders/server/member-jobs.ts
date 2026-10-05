import "server-only";
import { z } from "zod";
import type { OutgoingEmail } from "@/lib/email";
import { canEmail, wantsSessionReminder, type ReminderMember } from "../members";
import { lessonNotice, memberReminderEmail, practiceNotice, sessionNotice, type Notice, type SessionInfo } from "../copy";
import { practiceReminderDue } from "../practice";
import { liveStage, pastLocalHour, qaWindow, unlockWindow } from "../windows";
import type { NotificationSettings } from "@/lib/notification-settings/topics";
import { memberZone } from "../zone";
import { mapInChunks, type DeliveryOutcome } from "../summary";
import { deliver, deliveryKey, sentDeliveryKeys, type Delivery, type DeliveryKind, type Service } from "./data";

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
  /** Admin → Member notifications: on/off, wording, timing and email per type. */
  settings: NotificationSettings;
}

const CONCURRENCY = 8;

interface Planned {
  member: ReminderMember;
  delivery: Delivery;
  notice: Notice;
  email: boolean;
}

const HOUR_MS = 3_600_000;
/** How far back to look for reminders already sent (each kind's own window, plus slack). */
const SENT_LOOKBACK_HOURS: Partial<Record<DeliveryKind, number>> = { practice: 60, lesson_unlocked: 84, qa_day_before: 60, qa_day_of: 60 };

/**
 * Delivers planned reminders a few at a time; emails go only with reminders that were new. The
 * hourly run first drops the ones an earlier run already sent (the RPC would refuse them anyway).
 */
async function deliverAll(ctx: JobContext, all: readonly Planned[]): Promise<JobResult> {
  const kinds = [...new Set(all.map((p) => p.delivery.kind))];
  const lookback = Math.max(0, ...kinds.map((k) => SENT_LOOKBACK_HOURS[k] ?? 0));
  const sent = kinds.length && lookback ? await sentDeliveryKeys(ctx.sb, kinds, new Date(ctx.now.getTime() - lookback * HOUR_MS)) : new Set<string>();
  const planned = all.filter((p) => !sent.has(deliveryKey(p.delivery)));
  const outcomes = await mapInChunks(planned, CONCURRENCY, (p) => deliver(ctx.sb, p.delivery));
  const emails = planned.flatMap((p, i) =>
    outcomes[i] === "sent" && p.email && p.member.email
      ? [{ to: p.member.email, art: "photo" as const, ...memberReminderEmail(p.member.firstName, p.notice, ctx.siteUrl) }]
      : []
  );
  return { outcomes, emails };
}

/** a. "Today / tomorrow is a practice day" for members who opted in and haven't practiced yet. */
export async function runPracticeJob(ctx: JobContext): Promise<JobResult> {
  const topic = ctx.settings.topics.practice;
  if (!topic.enabled) return { outcomes: [], emails: [] };
  const planned = ctx.members.flatMap((member): Planned[] => {
    const target = practiceReminderDue(
      {
        timezone: member.timezone,
        practiceDays: member.practiceDays,
        practicedOn: member.practicedOn,
        hasCourses: member.hasCourses,
        wantsReminders: member.prefs.practice_reminders,
      },
      ctx.now,
      ctx.settings.practice
    );
    if (!target) return [];
    const notice = practiceNotice(ctx.settings, target, member);
    const email = topic.email && canEmail(member, ctx.emailConfigured);
    return [{ member, notice, email, delivery: { userId: member.userId, kind: "practice", ref: target.date, noticeKind: "system", notice, topic: "practice" } }];
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
  if (!ctx.settings.topics.lesson_unlocked.enabled) return { outcomes: [], emails: [] };
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
    // Announced from the chosen hour of the member's day; the 72-hour lookback catches up later.
    if (!pastLocalHour(ctx.now, member.timezone, ctx.settings.lessonUnlocked.hour)) return [];
    const notice = lessonNotice(ctx.settings, { lessonId: row.lesson_id, lessonTitle: row.lesson_title, courseId: row.course_id, courseTitle: row.course_title }, member.firstName);
    return [{ member, notice, email: false, delivery: { userId: member.userId, kind: "lesson_unlocked", ref: row.lesson_id, noticeKind: "lesson", notice, topic: "lesson_unlocked" } }];
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
  const topic = ctx.settings.topics.live_session;
  if (!topic.enabled) return { outcomes: [], emails: [] };
  const { sessions, rsvps } = await loadUpcomingSessions(ctx);
  const planned = sessions.flatMap((session) =>
    ctx.members.flatMap((member): Planned[] => {
      if (!wantsSessionReminder(member, session.kind, rsvps.has(`${session.id}:${member.userId}`))) return [];
      // The day before is by the member's own calendar and clock, so each member has a stage.
      const zone = memberZone(member.timezone);
      const stage = liveStage(session.startsAt, ctx.now, zone, ctx.settings.liveSession);
      if (!stage) return [];
      const notice = sessionNotice(ctx.settings, session, stage, ctx.now, zone, member.firstName);
      const kind = stage === "day_of" ? "qa_day_of" : "qa_day_before";
      const email = topic.email && canEmail(member, ctx.emailConfigured);
      return [{ member, notice, email, delivery: { userId: member.userId, kind, ref: session.id, noticeKind: "event", notice, topic: "live_session" } }];
    })
  );
  return deliverAll(ctx, planned);
}
