import "server-only";
import { getMux } from "@/lib/mux";
import { createServiceClient } from "@/lib/supabase/admin";
import { notifyTeamSafely } from "@/lib/notify-team";
import { settleOutcome, type MuxUploadState } from "./settle";
import type { FeedbackStatus } from "./status";

/** Mux direct uploads for videos sent to Roni. */

export function isMuxConfigured(): boolean {
  return Boolean(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET);
}

export interface UploadingRow {
  id: string;
  status: FeedbackStatus;
  mux_upload_id: string | null;
  mux_asset_id: string | null;
  created_at: string;
}

/** Most rows settled per page load, so a page never waits on a long Mux round trip. */
const MAX_SETTLE_PER_LOAD = 8;

async function readMuxState(row: UploadingRow): Promise<(MuxUploadState & { assetId: string | null }) | null> {
  if (!isMuxConfigured() || (!row.mux_upload_id && !row.mux_asset_id)) return null;
  const mux = getMux();
  let uploadStatus: string | null = null;
  let assetId = row.mux_asset_id;
  if (!assetId && row.mux_upload_id) {
    const upload = await mux.video.uploads.retrieve(row.mux_upload_id);
    uploadStatus = upload.status ?? null;
    assetId = upload.asset_id ?? null;
  }
  if (!assetId) return { uploadStatus, assetId: null, assetStatus: null, playbackId: null, durationSeconds: null };
  const asset = await mux.video.assets.retrieve(assetId);
  return {
    uploadStatus,
    assetId,
    assetStatus: asset.status ?? null,
    playbackId: asset.playback_ids?.[0]?.id ?? null,
    durationSeconds: typeof asset.duration === "number" ? Math.round(asset.duration * 10) / 10 : null,
  };
}

function isNotFound(err: unknown): boolean {
  return typeof err === "object" && err !== null && "status" in err && (err as { status: unknown }).status === 404;
}

/** Deletes a Mux asset; true when it's gone (already missing counts as gone). */
export async function deleteMuxAsset(assetId: string, videoId: string | null): Promise<boolean> {
  try {
    await getMux().video.assets.delete(assetId);
    return true;
  } catch (err) {
    if (isNotFound(err)) return true;
    console.error("[feedback] Mux asset delete failed", { videoId, assetId, error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

/** Cancels a direct upload that never finished (so nothing arrives later). */
export async function cancelMuxUpload(uploadId: string, videoId: string): Promise<void> {
  try {
    const upload = await getMux().video.uploads.retrieve(uploadId);
    if (upload.asset_id) await deleteMuxAsset(upload.asset_id, videoId);
    else if (upload.status === "waiting") await getMux().video.uploads.cancel(uploadId);
  } catch (err) {
    if (!isNotFound(err)) console.error("[feedback] Mux upload cancel failed", { videoId, error: err instanceof Error ? err.message : String(err) });
  }
}

/** The asset behind a row, looking through the direct upload when the row doesn't know it yet. */
export async function assetIdFor(row: { mux_asset_id: string | null; mux_upload_id: string | null }): Promise<string | null> {
  if (row.mux_asset_id) return row.mux_asset_id;
  if (!row.mux_upload_id) return null;
  const upload = await getMux().video.uploads.retrieve(row.mux_upload_id);
  return upload.asset_id ?? null;
}

/**
 * Brings one "uploading" row up to date with Mux (service role: the values come from Mux, not
 * from the member). Returns the row's status afterwards.
 */
/** Never throws: a page load settles uploads, and it must not fail over an email. */
async function notifyTeamOfVideo(sb: ReturnType<typeof createServiceClient>, title: string, userId: string): Promise<void> {
  await notifyTeamSafely("videos", async () => {
    const { data } = await sb.auth.admin.getUserById(userId);
    return {
      subject: "New video for feedback",
      lines: [`${data.user?.email ?? "A member"} sent a video for Roni's feedback. Its title:`],
      quoted: title,
      path: "/studio",
    };
  });
}

export async function settleUpload(row: UploadingRow, now: Date = new Date()): Promise<FeedbackStatus> {
  if (row.status !== "uploading") return row.status;
  let state: Awaited<ReturnType<typeof readMuxState>> = null;
  try {
    state = await readMuxState(row);
  } catch (err) {
    console.error("[feedback] Mux lookup failed", { videoId: row.id, error: err instanceof Error ? err.message : String(err) });
    return row.status;
  }
  const outcome = settleOutcome(state, now.getTime() - new Date(row.created_at).getTime());
  if (outcome.kind === "pending") return row.status;
  if (outcome.kind === "too_long" && state?.assetId) await deleteMuxAsset(state.assetId, row.id);

  const patch =
    outcome.kind === "ready"
      ? { status: "waiting", mux_asset_id: state?.assetId ?? null, mux_playback_id: outcome.playbackId, duration_seconds: outcome.durationSeconds }
      : { status: "errored", mux_asset_id: state?.assetId ?? row.mux_asset_id };
  const sb = createServiceClient();
  const { data: settled, error } = await sb
    .from("feedback_videos")
    .update(patch)
    .eq("id", row.id)
    .eq("status", "uploading")
    .select("title, user_id");
  if (!error && patch.status === "waiting" && settled?.[0]) await notifyTeamOfVideo(sb, settled[0].title as string, settled[0].user_id as string);
  if (error) {
    console.error("[feedback] could not settle upload", { videoId: row.id, error: error.message });
    return row.status;
  }
  return patch.status as FeedbackStatus;
}

/** Settles a batch of stale "uploading" rows (the member's list, the Studio queue). */
export async function settleUploads(rows: readonly UploadingRow[]): Promise<number> {
  const pending = rows.filter((r) => r.status === "uploading").slice(0, MAX_SETTLE_PER_LOAD);
  const results = await Promise.all(pending.map((r) => settleUpload(r)));
  return results.filter((s) => s !== "uploading").length;
}
