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
    .select("id, course_id, mux_playback_id, mux_playback_policy, free_preview")
    .eq("id", lessonId)
    .single();

  if (error || !lesson) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (!lesson.mux_playback_id) {
    return NextResponse.json({ error: "no playback yet" }, { status: 404 });
  }

  if (!lesson.free_preview) {
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("course_id")
      .eq("course_id", lesson.course_id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!enrollment) {
      return NextResponse.json({ error: "not enrolled" }, { status: 403 });
    }
  }

  if (lesson.mux_playback_policy === "public") {
    return NextResponse.json({ playbackId: lesson.mux_playback_id, token: null });
  }

  const token = await signPlaybackId(lesson.mux_playback_id);
  return NextResponse.json({ playbackId: lesson.mux_playback_id, token });
}
