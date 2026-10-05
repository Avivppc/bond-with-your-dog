import "server-only";
import { sendEmailBatch, siteUrl } from "@/lib/email";
import { isEmailConfigured } from "@/lib/feedback/notify-email";
import { EMPTY_COUNTS, countOutcomes, type JobCounts } from "../summary";
import type { ReminderMember } from "../members";
import { loadReminderMembers, type Service } from "./data";
import { runLessonJob, runPracticeJob, runSessionJob, type JobContext, type JobResult } from "./member-jobs";
import { runFeedbackOverdueJob } from "./feedback-job";
import { loadNotificationSettings } from "@/lib/notification-settings/server";

export type JobName = "practice" | "lessons" | "liveSessions" | "feedbackOverdue";

export interface ReminderRunSummary {
  ok: boolean;
  ranAt: string;
  members: number;
  jobs: Record<JobName, JobCounts>;
  errors: { job: JobName | "members"; message: string }[];
}

type Job = (ctx: JobContext) => Promise<JobResult>;

const MEMBER_JOBS: readonly [JobName, Job][] = [
  ["practice", runPracticeJob],
  ["lessons", runLessonJob],
  ["liveSessions", runSessionJob],
];

async function runJob(name: JobName, job: Job, ctx: JobContext): Promise<{ counts: JobCounts; error: string | null }> {
  try {
    const result = await job(ctx);
    const emailed = await sendEmailBatch(result.emails);
    const counts = countOutcomes(result.outcomes, emailed);
    return { counts, error: counts.failed > 0 ? `${counts.failed} deliveries failed` : null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[reminders] job failed", { job: name, error: message });
    return { counts: EMPTY_COUNTS, error: message };
  }
}

/**
 * Runs every reminder job once. Jobs are independent: one failing doesn't stop the others, and the
 * delivery log makes a re-run (or an overlapping run) send nothing twice.
 */
async function loadMembersSafely(sb: Service): Promise<{ members: ReminderMember[]; error: string | null }> {
  try {
    return { members: await loadReminderMembers(sb), error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[reminders] member list failed", { error: message });
    return { members: [], error: message };
  }
}

export async function runReminderJobs(sb: Service, now: Date = new Date()): Promise<ReminderRunSummary> {
  const [{ members, error: membersError }, settings] = await Promise.all([loadMembersSafely(sb), loadNotificationSettings()]);
  const ctx: JobContext = { sb, now, members, emailConfigured: isEmailConfigured(), siteUrl: siteUrl(), settings };
  // Without the member list the member jobs would wrongly find nobody due; skip them instead.
  const jobs: [JobName, Job][] = [...(membersError ? [] : MEMBER_JOBS), ["feedbackOverdue", runFeedbackOverdueJob]];
  const results = await Promise.all(jobs.map(async ([name, job]) => ({ name, ...(await runJob(name, job, ctx)) })));

  const counts = Object.fromEntries(results.map((r) => [r.name, r.counts]));
  const allErrors: ReminderRunSummary["errors"] = [
    ...(membersError ? [{ job: "members" as const, message: membersError }] : []),
    ...results.flatMap((r) => (r.error ? [{ job: r.name, message: r.error }] : [])),
  ];
  return {
    ok: allErrors.length === 0,
    ranAt: now.toISOString(),
    members: members.length,
    jobs: {
      practice: counts.practice ?? EMPTY_COUNTS,
      lessons: counts.lessons ?? EMPTY_COUNTS,
      liveSessions: counts.liveSessions ?? EMPTY_COUNTS,
      feedbackOverdue: counts.feedbackOverdue ?? EMPTY_COUNTS,
    },
    errors: allErrors,
  };
}
