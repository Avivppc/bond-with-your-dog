import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { assetIdFor, deleteMuxAsset, isMuxConfigured } from "./upload-server";
import { canCancelSubscription, type SubscriptionLike } from "./membership";
import { listFilesRecursive } from "./storage-walk";

type Service = ReturnType<typeof createServiceClient>;

/** Buckets where members keep files under a folder named after their user id. */
const MEMBER_BUCKETS = ["profile-photos", "routine-music", "community-media"];
/** Paths per storage remove call. */
const REMOVE_BATCH = 1000;
const TRY_AGAIN = "We couldn't delete your account. Please try again, or ask us from Help.";

type MuxRow = { mux_asset_id: string | null; mux_upload_id: string | null };

/**
 * The member's videos on Mux (sent to Roni or shared) must go before the account does — once
 * the rows are gone nobody could find them again. False when any delete failed.
 */
async function deleteMuxAssets(sb: Service, userId: string): Promise<boolean> {
  const [feedback, shared] = await Promise.all([
    sb.from("feedback_videos").select("mux_asset_id, mux_upload_id").eq("user_id", userId),
    sb.from("student_videos").select("mux_asset_id, mux_upload_id").eq("user_id", userId),
  ]);
  if (feedback.error || shared.error) {
    console.error("[account] video lookup failed", { userId, error: feedback.error?.message ?? shared.error?.message });
    return false;
  }
  const rows = [...(feedback.data ?? []), ...(shared.data ?? [])] as MuxRow[];
  if (!rows.some((r) => r.mux_asset_id || r.mux_upload_id)) return true;
  if (!isMuxConfigured()) {
    console.error("[account] member has Mux videos but Mux is not configured", { userId });
    return false;
  }
  try {
    const ids = (await Promise.all(rows.map(assetIdFor))).filter((id): id is string => Boolean(id));
    const results = await Promise.all(ids.map((id) => deleteMuxAsset(id, null)));
    return results.every(Boolean);
  } catch (err) {
    console.error("[account] Mux lookup failed", { userId, error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

/** Every file in the member's folder of each bucket, nested folders included (e.g. `<user>/stories/`). */
async function deleteStoredFiles(sb: Service, userId: string): Promise<void> {
  for (const bucket of MEMBER_BUCKETS) {
    const storage = sb.storage.from(bucket);
    const { paths, errors } = await listFilesRecursive((prefix, options) => storage.list(prefix, options), userId);
    for (const e of errors) console.error("[account] storage list failed", { userId, bucket, prefix: e.prefix, error: e.message });
    for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
      const { error: removeError } = await storage.remove(paths.slice(i, i + REMOVE_BATCH));
      if (removeError) console.error("[account] storage remove failed", { userId, bucket, error: removeError.message });
    }
  }
}

/** A subscription that could still bill the member (renewing, or paused and resumable). */
function stillBills(s: SubscriptionLike): boolean {
  return canCancelSubscription(s) || s.status === "paused";
}

/**
 * Deletes a member's account: their videos on Mux, their help requests and uploaded files, then
 * the auth user (which cascades to profile, dogs, progress, practice, feedback, orders,
 * notifications…). Refuses while a subscription could still bill, so nobody pays for a deleted account.
 */
export async function deleteAccountData(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = createServiceClient();
  const { data: subs, error: subsError } = await sb.from("subscriptions").select("status, current_period_end, canceled_at").eq("user_id", userId);
  if (subsError) {
    console.error("[account] subscription check failed", { userId, error: subsError.message });
    return { ok: false, error: TRY_AGAIN };
  }
  if ((subs ?? []).some((s) => stillBills(s as SubscriptionLike))) {
    return { ok: false, error: "You have a subscription that could still renew. Cancel it under Membership & purchases first, then delete your account." };
  }

  if (!(await deleteMuxAssets(sb, userId))) return { ok: false, error: TRY_AGAIN };
  const { error: supportError } = await sb.from("support_requests").delete().eq("user_id", userId);
  if (supportError) {
    console.error("[account] help requests delete failed", { userId, error: supportError.message });
    return { ok: false, error: TRY_AGAIN };
  }
  await deleteStoredFiles(sb, userId);
  const { error } = await sb.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[account] delete user failed", { userId, error: error.message });
    return { ok: false, error: TRY_AGAIN };
  }
  return { ok: true };
}
