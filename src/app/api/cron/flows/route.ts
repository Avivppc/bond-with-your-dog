import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/reminders/cron-auth";
import { runFlows, TIME_BUDGET_MS } from "@/lib/flows/server/runner";
import { sendDueCampaigns } from "@/lib/flows/server/campaigns";
import { recordJobRun } from "@/lib/job-runs";

// Vercel caps Hobby functions at 60 seconds.
export const maxDuration = 60;

/**
 * Email flows and campaigns. Supabase pg_cron calls this every 15 minutes (and Vercel once a day as
 * a backup) with `Authorization: Bearer $CRON_SECRET`; anything else is rejected. Safe to call more
 * than once: people are leased and every email is logged before it's sent.
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
  const started = Date.now();
  const now = new Date();
  const flows = await runFlows(sb, now, started);
  const campaigns = await sendDueCampaigns(sb, now, started + TIME_BUDGET_MS);
  const ok = flows.ok && campaigns.ok;
  await recordJobRun(sb, "flows", ok, ok ? undefined : "Some steps or campaign emails didn't go through. They'll be retried.");
  return NextResponse.json({ ...flows, campaignEmails: campaigns.sent, ok }, { status: ok ? 200 : 500 });
}
