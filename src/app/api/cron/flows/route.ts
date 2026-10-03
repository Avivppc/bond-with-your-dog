import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/reminders/cron-auth";
import { runFlows } from "@/lib/flows/server/runner";

// Vercel caps Hobby functions at 60 seconds.
export const maxDuration = 60;

/**
 * Email flows (vercel.json schedules it daily). Vercel Cron sends `Authorization: Bearer $CRON_SECRET`;
 * anything else is rejected. Safe to call more than once: runs are claimed before they move.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let sb: ReturnType<typeof createServiceClient>;
  try {
    sb = createServiceClient();
  } catch (error: unknown) {
    console.error("[cron flows] service client unavailable", { error: error instanceof Error ? error.message : error });
    return NextResponse.json({ ok: false, error: "not configured" }, { status: 500 });
  }
  const summary = await runFlows(sb);
  return NextResponse.json(summary, { status: summary.ok ? 200 : 500 });
}
