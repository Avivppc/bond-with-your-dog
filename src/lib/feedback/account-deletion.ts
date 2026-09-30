import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { getMux } from "@/lib/mux";
import { isMuxConfigured } from "./upload-server";
import { canCancelSubscription, type SubscriptionLike } from "./membership";

type Service = ReturnType<typeof createServiceClient>;

/** Buckets where members keep files under a folder named after their user id. */
const MEMBER_BUCKETS = ["profile-photos", "routine-music", "community-media"];
const LIST_LIMIT = 1000;

/** The member's videos on Mux (sent to Roni or shared) are deleted with the account. */
async function deleteMuxAssets(sb: Service, userId: string): Promise<void> {
  if (!isMuxConfigured()) return;
  const [feedback, shared] = await Promise.all([
    sb.from("feedback_videos").select("mux_asset_id").eq("user_id", userId).not("mux_asset_id", "is", null),
    sb.from("student_videos").select("mux_asset_id").eq("user_id", userId).not("mux_asset_id", "is", null),
  ]);
  const ids = [...(feedback.data ?? []), ...(shared.data ?? [])].map((r) => r.mux_asset_id as string);
  const mux = getMux();
  await Promise.all(
    ids.map((id) =>
      mux.video.assets.delete(id).catch((err: unknown) => {
        console.error("[account] Mux asset delete failed", { userId, assetId: id, error: err instanceof Error ? err.message : String(err) });
      })
    )
  );
}

async function deleteStoredFiles(sb: Service, userId: string): Promise<void> {
  for (const bucket of MEMBER_BUCKETS) {
    const { data, error } = await sb.storage.from(bucket).list(userId, { limit: LIST_LIMIT });
    if (error) {
      console.error("[account] storage list failed", { userId, bucket, error: error.message });
      continue;
    }
    const paths = (data ?? []).filter((f) => f.id).map((f) => `${userId}/${f.name}`);
    if (paths.length === 0) continue;
    const { error: removeError } = await sb.storage.from(bucket).remove(paths);
    if (removeError) console.error("[account] storage remove failed", { userId, bucket, error: removeError.message });
  }
}

/**
 * Deletes a member's account: their videos on Mux, their uploaded files, then the auth user
 * (which cascades to profile, dogs, progress, practice, feedback, orders, notifications…).
 * Refuses while a subscription still renews, so nobody is charged for a deleted account.
 */
export async function deleteAccountData(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = createServiceClient();
  const { data: subs, error: subsError } = await sb.from("subscriptions").select("status, current_period_end, canceled_at").eq("user_id", userId);
  if (subsError) {
    console.error("[account] subscription check failed", { userId, error: subsError.message });
    return { ok: false, error: "We couldn't delete your account. Please try again." };
  }
  if ((subs ?? []).some((s) => canCancelSubscription(s as SubscriptionLike))) {
    return { ok: false, error: "You have a subscription that still renews. Cancel it under Membership & purchases first, then delete your account." };
  }

  await deleteMuxAssets(sb, userId);
  await deleteStoredFiles(sb, userId);
  const { error } = await sb.auth.admin.deleteUser(userId);
  if (error) {
    console.error("[account] delete user failed", { userId, error: error.message });
    return { ok: false, error: "We couldn't delete your account. Please try again, or ask us from Help." };
  }
  return { ok: true };
}
