/**
 * Wording for reminder notifications and emails. Members' own free text (video titles, notes)
 * never goes into these; only course/session titles written by the team. Pure.
 */
import type { PracticeTarget } from "./practice";
import type { SessionKind } from "./members";
import { clockTime, relativeDayWord } from "./zone";
import { FEEDBACK_OVERDUE_DAYS, type QaStage } from "./windows";

export interface Notice {
  title: string;
  body: string | null;
  href: string;
}

export function practiceNotice(target: PracticeTarget, sessionMinutes: number): Notice {
  return {
    title: target.when === "today" ? "Today is a practice day" : "Tomorrow is a practice day",
    body: `${sessionMinutes} minutes with your dog is all it takes. Your plan is ready.`,
    href: "/plan",
  };
}

export function lessonNotice(lesson: { lessonId: string; lessonTitle: string; courseId: string; courseTitle: string }): Notice {
  return {
    title: `A new lesson is open: ${lesson.lessonTitle}`,
    body: lesson.courseTitle,
    href: `/learn/${encodeURIComponent(lesson.courseId)}/${lesson.lessonId}`,
  };
}

export interface SessionInfo {
  id: string;
  kind: SessionKind;
  title: string;
  startsAt: Date;
}

export function sessionNotice(session: SessionInfo, stage: QaStage, now: Date, zone: string): Notice {
  const when = `${relativeDayWord(session.startsAt, now, zone)} at ${clockTime(session.startsAt, zone)}`;
  const name = session.kind === "live_qa" ? "Live Q&A with Roni" : session.title;
  return {
    title: `${name} ${when}`,
    body: session.kind === "live_qa" ? (stage === "day_of" ? `${session.title}. Bring your questions!` : session.title) : "You said you're coming.",
    href: `/community/meetups/${session.id}`,
  };
}

export function overdueNotice(videoId: string, days: number): Notice {
  return {
    title: `A feedback video has waited ${days} days`,
    body: "Open Roni's Studio to reply.",
    href: `/studio?id=${videoId}`,
  };
}

/** A short plain-text email to a member about a reminder. */
export function memberReminderEmail(firstName: string | null, notice: Notice, siteUrl: string): { subject: string; text: string } {
  return {
    subject: notice.title,
    text: [
      `Hi ${firstName?.trim() || "there"},`,
      "",
      notice.body ? `${notice.title}. ${notice.body}` : `${notice.title}.`,
      "",
      `Open it here: ${siteUrl}${notice.href}`,
      "",
      "You can turn reminder emails off in Settings.",
      "",
      "Happy training,",
      "Roni and the Bonded team",
    ].join("\n"),
  };
}

/** One email to the team listing newly overdue feedback videos (links only, no member text). */
export function overdueDigestEmail(videos: readonly { id: string; days: number }[], siteUrl: string): { subject: string; text: string } {
  const count = videos.length;
  return {
    subject: count === 1 ? "A feedback video is waiting for a reply" : `${count} feedback videos are waiting for a reply`,
    text: [
      `${count === 1 ? "This video has" : "These videos have"} waited more than ${FEEDBACK_OVERDUE_DAYS} days for feedback:`,
      "",
      ...videos.map((v) => `• ${v.days} days: ${siteUrl}/studio?id=${v.id}`),
      "",
      `All waiting videos: ${siteUrl}/studio`,
    ].join("\n"),
  };
}
