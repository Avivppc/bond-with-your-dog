import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { signPlaybackId } from "@/lib/mux";
import { vimeoEmbedUrl } from "@/lib/video/vimeo";

export type PlaybackResponse =
  | { provider: "vimeo"; embedUrl: string }
  | { provider: "mux"; playbackId: string; token: string | null };

/**
 * Returns how to play a lesson's video — only after the shared access rule passes.
 * Video references live in lesson_videos, which clients cannot read directly.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: canAccess, error: accessError } = await supabase.rpc("can_access_lesson", { p_lesson_id: lessonId });
  if (accessError) {
    console.error("can_access_lesson failed", { lessonId, error: accessError.message });
    return NextResponse.json({ error: "could not verify access" }, { status: 500 });
  }
  if (!canAccess) return NextResponse.json({ error: "no access to this lesson" }, { status: 403 });

  const { data: video, error } = await createServiceClient()
    .from("lesson_videos")
    .select("provider, external_id, external_hash, playback_policy")
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (error) {
    console.error("lesson video lookup failed", { lessonId, error: error.message });
    return NextResponse.json({ error: "could not load video" }, { status: 500 });
  }
  if (!video) return NextResponse.json({ error: "no video yet" }, { status: 404 });

  const body: PlaybackResponse =
    video.provider === "vimeo"
      ? { provider: "vimeo", embedUrl: vimeoEmbedUrl({ id: video.external_id, hash: video.external_hash }) }
      : {
          provider: "mux",
          playbackId: video.external_id,
          token: video.playback_policy === "public" ? null : await signPlaybackId(video.external_id),
        };

  return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
}
