import "server-only";
import { z } from "zod";
import { overdueDigestEmail, overdueNotice } from "../copy";
import { daysWaiting, feedbackOverdueCutoff } from "../windows";
import { mapInChunks } from "../summary";
import { deliver, type Delivery } from "./data";
import type { JobContext, JobResult } from "./member-jobs";

const VideoRow = z.object({ id: z.string().uuid(), created_at: z.string() });

const MAX_VIDEOS = 200;
const CONCURRENCY = 8;

/** Where the team's overdue digest goes: COACH_INBOX, else the sending address. */
export function teamInbox(): string | null {
  return process.env.COACH_INBOX?.trim() || process.env.EMAIL_FROM?.trim() || null;
}

async function loadOverdueVideos(ctx: JobContext): Promise<{ id: string; days: number }[]> {
  const { data, error } = await ctx.sb
    .from("feedback_videos")
    .select("id, created_at")
    .eq("status", "waiting")
    .lt("created_at", feedbackOverdueCutoff(ctx.now).toISOString())
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
 * d. Videos waiting more than 5 days: one in-app alert per video for each staff member, and one
 * digest email to the team inbox listing the videos it hasn't been told about yet.
 */
export async function runFeedbackOverdueJob(ctx: JobContext): Promise<JobResult> {
  const videos = await loadOverdueVideos(ctx);
  if (videos.length === 0) return { outcomes: [], emails: [] };
  const staff = await loadStaffIds(ctx);

  const inApp: Delivery[] = videos.flatMap((v) =>
    staff.map((userId): Delivery => ({ userId, kind: "feedback_overdue", ref: v.id, noticeKind: "system", notice: overdueNotice(v.id, v.days) }))
  );
  const outcomes = await mapInChunks(inApp, CONCURRENCY, (d) => deliver(ctx.sb, d));

  const inbox = teamInbox();
  if (!inbox || !ctx.emailConfigured) return { outcomes, emails: [] };
  const claims = await mapInChunks(videos, CONCURRENCY, (v) =>
    deliver(ctx.sb, { userId: null, kind: "feedback_overdue_email", ref: v.id, noticeKind: "system", notice: null })
  );
  const fresh = videos.filter((_, i) => claims[i] === "sent");
  if (fresh.length === 0) return { outcomes, emails: [] };
  return { outcomes, emails: [{ to: inbox, ...overdueDigestEmail(fresh, ctx.siteUrl) }] };
}
