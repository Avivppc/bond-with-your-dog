import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { LESSON_FILES_BUCKET } from "@/lib/lesson-files";

const SIGNED_URL_SECONDS = 60;

/** Download a lesson file: RLS on lesson_files enforces lesson access; then a short-lived signed URL. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lessonId: string; fileId: string }> }
) {
  const { lessonId, fileId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Row is only visible when can_access_lesson() passes (policy lesson_files_read_accessible).
  const { data: file } = await supabase
    .from("lesson_files")
    .select("storage_path, file_name")
    .eq("id", fileId)
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (!file) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { data, error } = await createServiceClient()
    .storage.from(LESSON_FILES_BUCKET)
    .createSignedUrl(file.storage_path, SIGNED_URL_SECONDS, { download: file.file_name });
  if (error || !data) {
    console.error("lesson file signed url failed", { fileId, error: error?.message });
    return NextResponse.json({ error: "could not prepare download" }, { status: 500 });
  }
  return NextResponse.redirect(data.signedUrl, { headers: { "Cache-Control": "private, no-store" } });
}
