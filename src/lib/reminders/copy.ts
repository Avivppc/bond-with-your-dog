/**
 * Wording for reminder notifications and emails, from the team's templates (Admin → Member
 * notifications). Members' own free text (video titles, notes) never goes into these; only
 * course/session titles written by the team. Pure.
 */
import { noticeText, type NotificationSettings } from "../notification-settings/topics";
import type { PracticeTarget } from "./practice";
import type { SessionKind } from "./members";
import { clockTime, relativeDayWord } from "./zone";
import type { QaStage } from "./windows";

export interface Notice {
  title: string;
  body: string | null;
  href: string;
}

export function practiceNotice(settings: NotificationSettings, target: PracticeTarget, member: { firstName: string | null; sessionMinutes: number }): Notice {
  const text = noticeText(settings, "practice", {
    first_name: member.firstName,
    day: target.when === "today" ? "Today" : "Tomorrow",
    minutes: String(member.sessionMinutes),
  });
  return { ...text, href: "/plan" };
}

export function lessonNotice(
  settings: NotificationSettings,
  lesson: { lessonId: string; lessonTitle: string; courseId: string; courseTitle: string },
  firstName: string | null,
): Notice {
  const text = noticeText(settings, "lesson_unlocked", { first_name: firstName, lesson_title: lesson.lessonTitle, course_title: lesson.courseTitle });
  return { ...text, href: `/learn/${encodeURIComponent(lesson.courseId)}/${lesson.lessonId}` };
}

export interface SessionInfo {
  id: string;
  kind: SessionKind;
  title: string;
  startsAt: Date;
}

export function sessionNotice(settings: NotificationSettings, session: SessionInfo, stage: QaStage, now: Date, zone: string, firstName: string | null): Notice {
  const text = noticeText(settings, "live_session", {
    first_name: firstName,
    session: session.kind === "live_qa" ? "Live Q&A with Roni" : session.title,
    when: `${relativeDayWord(session.startsAt, now, zone)} at ${clockTime(session.startsAt, zone)}`,
    topic: session.kind === "live_qa" ? (stage === "day_of" ? `${session.title}. Bring your questions!` : session.title) : "You said you're coming.",
  });
  return { ...text, href: `/community/meetups/${session.id}` };
}

export function overdueNotice(settings: NotificationSettings, videoId: string, days: number): Notice {
  return { ...noticeText(settings, "feedback_overdue", { days: String(days) }), href: `/studio?id=${videoId}` };
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
export function overdueDigestEmail(videos: readonly { id: string; days: number }[], siteUrl: string, thresholdDays: number): { subject: string; text: string } {
  const count = videos.length;
  return {
    subject: count === 1 ? "A feedback video is waiting for a reply" : `${count} feedback videos are waiting for a reply`,
    text: [
      `${count === 1 ? "This video has" : "These videos have"} waited more than ${thresholdDays} days for feedback:`,
      "",
      ...videos.map((v) => `• ${v.days} days: ${siteUrl}/studio?id=${v.id}`),
      "",
      `All waiting videos: ${siteUrl}/studio`,
    ].join("\n"),
  };
}
