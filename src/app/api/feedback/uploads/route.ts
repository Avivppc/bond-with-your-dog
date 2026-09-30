import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getMux } from "@/lib/mux";
import { isMuxConfigured } from "@/lib/feedback/upload-server";
import { checkVideoDuration, checkVideoFile } from "@/lib/feedback/video-file";

const Body = z.object({
  dogId: z.string().uuid().nullable(),
  moveId: z.string().uuid().nullable(),
  lessonId: z.string().uuid().nullable(),
  note: z.string().max(2000).default(""),
  file: z.object({ name: z.string().min(1).max(255), type: z.string().max(100), size: z.number().int().nonnegative() }),
  /** Read from the file's metadata in the browser; null when the browser can't read this format. */
  durationSeconds: z.number().positive().nullable(),
});

const RPC_ERRORS: Record<string, { status: number; error: string }> = {
  "28000": { status: 401, error: "Please sign in again." },
  "42501": { status: 403, error: "That dog or lesson isn't available on your account." },
  "22023": { status: 400, error: "Please choose a move or lesson from the list." },
  "54000": { status: 429, error: "You can send up to 5 videos a day. Please try again tomorrow." },
};

function fail(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

/**
 * Starts "send a video to Roni": creates the member's feedback_videos row (via the DB function,
 * which checks the dog/move/lesson), then a Mux direct upload tagged with the row id.
 * The browser uploads straight to Mux, then calls ./[id]/finalize.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "Please sign in again.");
  if (!isMuxConfigured()) {
    return NextResponse.json({ error: "Video upload isn't switched on yet. Please ask Roni's team.", code: "not_configured" }, { status: 503 });
  }

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "Something is missing. Please check the form and try again.");
  const input = parsed.data;
  const invalid = checkVideoFile(input.file) ?? (input.durationSeconds === null ? null : checkVideoDuration(input.durationSeconds));
  if (invalid) return fail(400, invalid);

  const { data: videoId, error } = await supabase.rpc("start_feedback_video", {
    p_dog_id: input.dogId,
    p_move_id: input.moveId,
    p_lesson_id: input.lessonId,
    p_title: null,
    p_note: input.note,
  });
  if (error || typeof videoId !== "string") {
    console.error("[feedback] start_feedback_video failed", { userId: user.id, error: error?.message });
    const known = RPC_ERRORS[error?.code ?? ""];
    return fail(known?.status ?? 500, known?.error ?? "We couldn't start your upload. Please try again.");
  }

  const service = createServiceClient();
  try {
    const upload = await getMux().video.uploads.create({
      cors_origin: request.headers.get("origin") ?? "*",
      new_asset_settings: { playback_policy: ["public"], video_quality: "basic", passthrough: videoId },
    });
    const { error: saveError } = await service.from("feedback_videos").update({ mux_upload_id: upload.id }).eq("id", videoId);
    if (saveError) throw new Error(saveError.message);
    return NextResponse.json({ videoId, uploadUrl: upload.url });
  } catch (err) {
    console.error("[feedback] Mux upload could not be created", { videoId, error: err instanceof Error ? err.message : String(err) });
    const { error: cleanupError } = await service.from("feedback_videos").delete().eq("id", videoId).eq("status", "uploading");
    if (cleanupError) console.error("[feedback] could not remove the unused row", { videoId, error: cleanupError.message });
    return fail(502, "The video service didn't respond. Please try again in a minute.");
  }
}
