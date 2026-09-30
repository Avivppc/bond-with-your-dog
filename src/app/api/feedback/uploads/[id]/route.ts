import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { cancelMuxUpload, isMuxConfigured } from "@/lib/feedback/upload-server";

/**
 * The browser's upload to Mux failed: drop the member's unfinished video (only while it's still
 * "uploading") so it doesn't linger as "processing" and the Mux upload is cancelled.
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "not found" }, { status: 404 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  // RLS: members only see their own videos.
  const { data: row } = await supabase.from("feedback_videos").select("id, status, mux_upload_id").eq("id", id).maybeSingle();
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (row.status !== "uploading") return NextResponse.json({ error: "This video is already with Roni." }, { status: 409 });

  if (row.mux_upload_id && isMuxConfigured()) await cancelMuxUpload(row.mux_upload_id as string, id);
  const { error } = await createServiceClient().from("feedback_videos").delete().eq("id", id).eq("status", "uploading");
  if (error) {
    console.error("[feedback] abandon upload failed", { id, error: error.message });
    return NextResponse.json({ error: "Please try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
