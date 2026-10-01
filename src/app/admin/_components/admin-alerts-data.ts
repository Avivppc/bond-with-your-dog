import "server-only";
import { createServiceClient } from "@/lib/supabase/admin";
import { loadStudioStats } from "@/lib/feedback/studio";
import type { AdminAlertCounts } from "@/lib/admin-alerts";

type Service = ReturnType<typeof createServiceClient>;
type CountResult = { count: number | null; error: { message: string } | null };

function countOf(res: CountResult, what: string): number {
  if (res.error) console.error(`[admin] ${what} count failed`, res.error.message);
  return res.count ?? 0;
}

async function inboxCount(sb: Service): Promise<number> {
  return countOf(await sb.from("support_requests").select("id", { count: "exact", head: true }).eq("status", "open"), "inbox");
}

/** Everything the bell counts. Callers must have passed requireStaff() (service role, no RLS). */
export async function loadAdminAlertCounts(canSeeInbox: boolean): Promise<AdminAlertCounts> {
  const sb = createServiceClient();
  const [studio, lessonQuestions, postsToReview, inbox] = await Promise.all([
    loadStudioStats(sb),
    sb.from("lesson_questions").select("id", { count: "exact", head: true }).eq("hidden", false).is("answer", null),
    sb.from("community_posts").select("id", { count: "exact", head: true }).or("status.eq.pending,report_count.gt.0").neq("status", "removed"),
    canSeeInbox ? inboxCount(sb) : Promise.resolve(null),
  ]);
  return {
    videos: studio.waiting,
    replies: studio.replies,
    lessonQuestions: countOf(lessonQuestions, "lesson questions"),
    liveQuestions: studio.questions,
    postsToReview: countOf(postsToReview, "posts to review"),
    inbox,
  };
}
