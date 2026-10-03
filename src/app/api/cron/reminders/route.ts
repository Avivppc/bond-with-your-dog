import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/reminders/cron-auth";
import { runReminderJobs } from "@/lib/reminders/server/run";
import { recordJobRun } from "@/lib/job-runs";
import { sendPendingPush } from "@/lib/push/server";

// Vercel caps Hobby functions at 60 seconds.
export const maxDuration = 60;
const PUSH_DEADLINE_MS = 20_000;

/**
 * Daily reminders (vercel.json schedules it). Vercel Cron sends `Authorization: Bearer $CRON_SECRET`;
 * anything else — including a missing CRON_SECRET — is rejected. Safe to call more than once: every
 * reminder is logged and sent at most once.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let sb: ReturnType<typeof createServiceClient>;
  try {
    sb = createServiceClient();
  } catch (error: unknown) {
    console.error("[cron reminders] service client unavailable", { error: error instanceof Error ? error.message : error });
    return NextResponse.json({ ok: false, error: "not configured" }, { status: 500 });
  }

  const summary = await runReminderJobs(sb);
  await recordJobRun(sb, "reminders", summary.ok);
  // Today's reminders (and anything else notified in the last half hour) to members' phones,
  // within what's left of the function's time.
  const pushes = await Promise.race([
    sendPendingPush(null).catch((error: unknown) => {
      console.error("[cron reminders] push failed", { error: error instanceof Error ? error.message : error });
      return 0;
    }),
    new Promise<"timed out">((resolve) => setTimeout(() => resolve("timed out"), PUSH_DEADLINE_MS)),
  ]);
  return NextResponse.json({ ...summary, pushes }, { status: summary.ok ? 200 : 500 });
}
