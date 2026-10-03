"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";

const LIST = "/admin/email-flows";
const RunOp = z.object({ flow_id: z.string().uuid(), run_id: z.string().uuid(), op: z.enum(["pause", "resume", "remove"]) });

type Client = ReturnType<typeof createServiceClient>;

/** Back to waiting if their wait hasn't ended yet, else active (the next job moves them on). */
async function resumeRun(sb: Client, flowId: string, runId: string, now: string): Promise<{ error: { message: string } | null }> {
  const { data, error } = await sb.from("email_flow_runs").select("wait_until").eq("id", runId).eq("flow_id", flowId).eq("status", "paused").maybeSingle();
  if (error || !data) return { error };
  const status = data.wait_until && data.wait_until > now ? "waiting" : "active";
  return sb.from("email_flow_runs").update({ status, updated_at: now }).eq("id", runId).eq("flow_id", flowId).eq("status", "paused");
}

/**
 * One person in a flow: pause (the job skips them), resume (they continue from their step; a wait
 * still runs to its end) or remove (they leave the flow now).
 */
export async function changeRun(formData: FormData): Promise<void> {
  await requireStaff("sales");
  const parsed = RunOp.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(LIST);
  const { flow_id: flowId, run_id: runId, op } = parsed.data;
  const sb = createServiceClient();
  const now = new Date().toISOString();
  const runs = () => sb.from("email_flow_runs");
  const { error } =
    op === "pause"
      ? await runs().update({ status: "paused", claimed_at: null, updated_at: now }).eq("id", runId).eq("flow_id", flowId).in("status", ["active", "waiting"])
      : op === "remove"
        ? await runs().update({ status: "exited", exit_reason: "removed", finished_at: now, claimed_at: null, updated_at: now }).eq("id", runId).eq("flow_id", flowId).in("status", ["active", "waiting", "paused"])
        : await resumeRun(sb, flowId, runId, now);
  if (error) console.error("[email flows] run change failed", { runId, op, error: error.message });
  revalidatePath(`${LIST}/${flowId}`);
  redirect(`${LIST}/${flowId}?done=${op}#people`);
}
