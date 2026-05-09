import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMux } from "@/lib/mux";

/**
 * Polled by the client after Mux upload completes. Looks up the upload at Mux,
 * fetches the asset, and writes the playback ID + status back to the row.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: row, error } = await supabase
    .from("student_videos")
    .select("id, user_id, mux_upload_id, mux_asset_id, mux_playback_id, status")
    .eq("id", id)
    .single();
  if (error || !row || row.user_id !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (row.mux_playback_id) {
    return NextResponse.json({
      status: row.status,
      playbackId: row.mux_playback_id,
    });
  }

  const mux = getMux();

  // Resolve asset via upload
  let assetId = row.mux_asset_id;
  if (!assetId && row.mux_upload_id) {
    const up = await mux.video.uploads.retrieve(row.mux_upload_id);
    assetId = up.asset_id ?? null;
  }
  if (!assetId) {
    return NextResponse.json({ status: "preparing" });
  }

  const asset = await mux.video.assets.retrieve(assetId);
  const playbackId = asset.playback_ids?.[0]?.id ?? null;
  const duration = asset.duration ? Math.round(asset.duration) : null;
  const status =
    asset.status === "ready"
      ? "ready"
      : asset.status === "errored"
        ? "errored"
        : "preparing";

  await supabase
    .from("student_videos")
    .update({
      mux_asset_id: assetId,
      mux_playback_id: playbackId,
      duration_seconds: duration,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  return NextResponse.json({ status, playbackId });
}
