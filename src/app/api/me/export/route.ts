import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exportFileName, shapeExport, type ExportSource } from "@/lib/feedback/export";

type Row = Record<string, unknown>;

/**
 * "Download my data" (Settings): everything Bonded stores about the signed-in member, read with
 * their own session (RLS), as a JSON file.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const own = (table: string, columns = "*") => supabase.from(table).select(columns);
  const results = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    own("dogs"),
    own("dog_skills", "dog_id, move_id, level, set_by, updated_at, moves(name)"),
    own("lesson_progress").eq("user_id", user.id),
    own("practice_sessions"),
    own("practice_plan"),
    own("feedback_videos"),
    own("feedback_notes", "video_id, at_seconds, body, created_at"),
    own("feedback_messages", "video_id, from_staff, body, created_at"),
    own("enrollments", "course_id, enrolled_at, expires_at, access_level, source, courses(title)").eq("user_id", user.id),
    own("orders", "id, status, amount_cents, currency, provider, paid_at, created_at, offers(title)").eq("user_id", user.id),
    own("subscriptions", "status, current_period_end, canceled_at, created_at, offers(title)").eq("user_id", user.id),
    own("support_requests", "kind, subject, body, page_url, status, answer, answered_at, created_at"),
    own("achievements").eq("user_id", user.id),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error("[export] data export failed", { userId: user.id, error: failed.error.message });
    return NextResponse.json({ error: "We couldn't prepare your data. Please try again." }, { status: 500 });
  }

  const [profile, ...lists] = results;
  const rows = lists.map((r) => (r.data ?? []) as unknown as Row[]);
  const source: ExportSource = {
    account: { id: user.id, email: user.email ?? "", created_at: user.created_at },
    profile: (profile.data as Row | null) ?? null,
    dogs: rows[0],
    skills: rows[1],
    lessonProgress: rows[2],
    practiceSessions: rows[3],
    practicePlan: rows[4],
    feedbackVideos: rows[5],
    feedbackNotes: rows[6],
    feedbackMessages: rows[7],
    enrollments: rows[8],
    orders: rows[9],
    subscriptions: rows[10],
    supportRequests: rows[11],
    achievements: rows[12],
  };
  const now = new Date();
  return new NextResponse(JSON.stringify(shapeExport(source, now), null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFileName(now)}"`,
      "Cache-Control": "no-store",
    },
  });
}
