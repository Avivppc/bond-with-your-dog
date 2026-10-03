import "server-only";
import type { createServiceClient } from "@/lib/supabase/admin";
import type { JobHeartbeat } from "@/lib/admin-dashboard";

type ServiceClient = ReturnType<typeof createServiceClient>;
export type JobName = "flows" | "reminders";

const MAX_ERROR = 500;

/** Notes a scheduled job's outcome so the dashboard can tell when it stopped or keeps failing. */
export async function recordJobRun(sb: ServiceClient, job: JobName, ok: boolean, error?: string): Promise<void> {
  const now = new Date().toISOString();
  const row: Record<string, string> = ok ? { job, last_ok_at: now } : { job, last_error_at: now, last_error: (error ?? "The run didn't finish.").slice(0, MAX_ERROR) };
  const { error: dbError } = await sb.from("job_runs").upsert(row, { onConflict: "job" });
  if (dbError) console.error("[jobs] heartbeat failed", { job, error: dbError.message });
}

export async function loadJobRun(sb: ServiceClient, job: JobName): Promise<JobHeartbeat | null> {
  const { data, error } = await sb.from("job_runs").select("last_ok_at, last_error_at, last_error").eq("job", job).maybeSingle();
  if (error) console.error("[jobs] heartbeat read failed", { job, error: error.message });
  if (!data) return null;
  return { lastOkAt: data.last_ok_at as string | null, lastErrorAt: data.last_error_at as string | null, lastError: data.last_error as string | null };
}
