import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getMux } from "@/lib/mux";

const Body = z.object({
  title: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  course_id: z.string().optional().nullable(),
  lesson_id: z.string().uuid().optional().nullable(),
  consent_public: z.boolean().default(false),
});

/**
 * Create a Mux direct upload URL and a draft student_videos row.
 * The client uploads directly to Mux, then calls /api/uploads/[id]/finalize.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }

  const mux = getMux();
  const upload = await mux.video.uploads.create({
    cors_origin: request.headers.get("origin") ?? "*",
    new_asset_settings: {
      playback_policy: ["public"],
      video_quality: "basic",
    },
  });

  const { data: row, error } = await supabase
    .from("student_videos")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      course_id: parsed.data.course_id ?? null,
      lesson_id: parsed.data.lesson_id ?? null,
      mux_upload_id: upload.id,
      status: "preparing",
      consent_public: parsed.data.consent_public,
      is_public: false, // becomes true after admin approval
    })
    .select("id")
    .single();

  if (error || !row) {
    return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });
  }

  return NextResponse.json({
    videoId: row.id,
    uploadUrl: upload.url,
    uploadId: upload.id,
  });
}
