import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { settleUpload, type UploadingRow } from "@/lib/feedback/upload-server";
import { EVENTS, trackMember } from "@/lib/analytics-server";

/**
 * Called by the browser after the Mux upload finishes (and polled while Mux encodes).
 * Moves the member's video to "waiting" once Mux reports the asset ready.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "not found" }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  // RLS: members only see their own videos.
  const { data: row, error } = await supabase
    .from("feedback_videos")
    .select("id, status, mux_upload_id, mux_asset_id, created_at")
    .eq("id", id)
    .maybeSingle<UploadingRow>();
  if (error) {
    console.error("[feedback] finalize lookup failed", { id, error: error.message });
    return NextResponse.json({ error: "Please try again." }, { status: 500 });
  }
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });

  const status = await settleUpload(row);
  // Polled while the video encodes: count it once, when it first reaches Roni's queue.
  if (row.status === "uploading" && status === "waiting") {
    trackMember(user, EVENTS.videoSubmitted, { video_id: row.id }, { dedupeKey: row.id });
  }
  return NextResponse.json({ status });
}
