import "server-only";
import { z } from "zod";
import { overdueDigestEmail, overdueNotice } from "../copy";
import { daysWaiting, feedbackOverdueCutoff } from "../windows";
import { mapInChunks } from "../summary";
import { teamRecipient } from "@/lib/notifications";
import { deliver, type Delivery } from "./data";
import type { JobContext, JobResult } from "./member-jobs";

const VideoRow = z.object({ id: z.string().uuid(), created_at: z.string() });

const MAX_VIDEOS = 200;
const CONCURRENCY = 8;

/** Where the team's overdue digest goes: the team email (Settings → Notifications), COACH_INBOX, else the sending address. */
export async function teamInbox(ctx: JobContext): Promise<string | null> {
  const { data, error } = await ctx.sb.from("email_settings").select("team_email").eq("id", 1).maybeSingle();
  if (error) console.error("[reminders] team email lookup failed", error.message);
  return teamRecipient((data?.team_email as string | null) ?? null, process.env.COACH_INBOX) ?? (process.env.EMAIL_FROM?.trim() || null);
}

async function loadOverdueVideos(ctx: JobContext): Promise<{ id: string; days: number }[]> {
  const { data, error } = await ctx.sb
    .from("feedback_videos")
    .select("id, created_at")
    .eq("status", "waiting")
    .lt("created_at", feedbackOverdueCutoff(ctx.now, ctx.settings.feedbackOverdue.days).toISOString())
    .order("created_at")
    .limit(MAX_VIDEOS);
  if (error) throw new Error(`overdue feedback videos failed: ${error.message}`);
  return (data ?? []).flatMap((raw: unknown) => {
    const parsed = VideoRow.safeParse(raw);
    return parsed.success ? [{ id: parsed.data.id, days: daysWaiting(new Date(parsed.data.created_at), ctx.now) }] : [];
  });
}

async function loadStaffIds(ctx: JobContext): Promise<string[]> {
  const { data, error } = await ctx.sb.from("staff_members").select("user_id");
  if (error) throw new Error(`staff list failed: ${error.message}`);
  return (data ?? []).map((r) => r.user_id as string);
}

/**
 * d. Videos waiting longer than the team's threshold: one in-app alert per video for each staff
 * member, and one digest email to the team inbox listing the videos it hasn't been told about yet.
 */
export async function runFeedbackOverdueJob(ctx: JobContext): Promise<JobResult> {
  const topic = ctx.settings.topics.feedback_overdue;
  if (!topic.enabled) return { outcomes: [], emails: [] };
  const videos = await loadOverdueVideos(ctx);
  if (videos.length === 0) return { outcomes: [], emails: [] };
  const staff = await loadStaffIds(ctx);

  const inApp: Delivery[] = videos.flatMap((v) =>
    staff.map((userId): Delivery => ({ userId, kind: "feedback_overdue", ref: v.id, noticeKind: "system", notice: overdueNotice(ctx.settings, v.id, v.days), topic: "feedback_overdue" }))
  );
  const outcomes = await mapInChunks(inApp, CONCURRENCY, (d) => deliver(ctx.sb, d));

  const inbox = await teamInbox(ctx);
  if (!inbox || !ctx.emailConfigured || !topic.email) return { outcomes, emails: [] };
  const claims = await mapInChunks(videos, CONCURRENCY, (v) =>
    deliver(ctx.sb, { userId: null, kind: "feedback_overdue_email", ref: v.id, noticeKind: "system", notice: null, topic: "feedback_overdue" })
  );
  const fresh = videos.filter((_, i) => claims[i] === "sent");
  if (fresh.length === 0) return { outcomes, emails: [] };
  return { outcomes, emails: [{ to: inbox, art: "none" as const, ...overdueDigestEmail(fresh, ctx.siteUrl, ctx.settings.feedbackOverdue.days) }] };
}
