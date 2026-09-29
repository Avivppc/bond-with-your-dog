import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { signPlaybackId } from "@/lib/mux";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  const { lessonId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: lesson, error } = await supabase
    .from("lessons")
    .select("id, mux_playback_id, mux_playback_policy")
    .eq("id", lessonId)
    .single();

  if (error || !lesson) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (!lesson.mux_playback_id) {
    return NextResponse.json({ error: "no playback yet" }, { status: 404 });
  }

  // Single access rule shared with web, app and quiz grading: free preview, or an
  // unexpired enrollment whose drip delay has passed.
  const { data: canAccess, error: accessError } = await supabase.rpc("can_access_lesson", {
    p_lesson_id: lessonId,
  });
  if (accessError) {
    console.error("can_access_lesson failed", { lessonId, error: accessError.message });
    return NextResponse.json({ error: "could not verify access" }, { status: 500 });
  }
  if (!canAccess) {
    return NextResponse.json({ error: "no access to this lesson" }, { status: 403 });
  }

  if (lesson.mux_playback_policy === "public") {
    return NextResponse.json({ playbackId: lesson.mux_playback_id, token: null });
  }

  const token = await signPlaybackId(lesson.mux_playback_id);
  return NextResponse.json({ playbackId: lesson.mux_playback_id, token });
}
