import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { loadSurveyList, type SurveyStatus } from "@/lib/surveys/server";
import { BTN_PRIMARY, BTN_SECONDARY, Card, EmptyState, MUTED, Notice, PageHeader, StatusPill, TABLE, TD, TH, THEAD, TROW, type PillTone } from "../_components/ui";
import { shortDate } from "../_components/list-kit";
import { createSurvey } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Assessments" };

const STATUS: Record<SurveyStatus, { tone: PillTone; label: string }> = {
  draft: { tone: "draft", label: "Draft" },
  published: { tone: "published", label: "Live" },
  closed: { tone: "draft", label: "Closed" },
};

interface QuizStat {
  lesson_id: string;
  course_id: string;
  course_title: string;
  lesson_title: string;
  pass_threshold: number;
  attempts: number;
  members: number;
  passed_members: number;
  average_score: number | null;
}

async function loadQuizStats(): Promise<QuizStat[] | null> {
  const { data, error } = await createServiceClient().rpc("admin_quiz_stats");
  if (error) {
    console.error("[assessments] quiz stats failed", { error: error.message });
    return null;
  }
  return ((data ?? []) as QuizStat[]).map((r) => ({ ...r, attempts: Number(r.attempts), members: Number(r.members), passed_members: Number(r.passed_members) }));
}

function CheckpointsCard({ stats }: { stats: QuizStat[] | null }) {
  return (
    <Card flush title="Chapter checkpoints" description="Quiz lessons inside chapters. Passing completes the lesson, so it counts toward the certificate.">
      {stats === null ? (
        <p className="px-5 pb-5 text-[14px] text-[#a4262c]">Couldn&apos;t load the numbers.</p>
      ) : stats.length === 0 ? (
        <div className="px-5 pb-5">
          <EmptyState title="No checkpoints yet">Add a lesson of type &quot;Quiz&quot; to a chapter to check what members learned.</EmptyState>
        </div>
      ) : (
        <div className="relative overflow-x-auto">
          <table className={TABLE}>
            <thead className={THEAD}>
              <tr>
                <th className={TH}>Checkpoint</th>
                <th className={TH}>Members tried</th>
                <th className={TH}>Passed</th>
                <th className={TH}>Average score</th>
                <th className={TH}>Attempts</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((q) => (
                <tr key={q.lesson_id} className={TROW}>
                  <td className={TD}>
                    <Link href={`/admin/courses/${q.course_id}/lessons/${q.lesson_id}`} className="font-medium hover:underline">
                      {q.lesson_title}
                    </Link>
                    <p className={`text-[12px] ${MUTED}`}>
                      {q.course_title} · pass at {q.pass_threshold}%
                    </p>
                  </td>
                  <td className={TD}>{q.members}</td>
                  <td className={TD}>{q.members ? `${q.passed_members} (${Math.round((q.passed_members / q.members) * 100)}%)` : "—"}</td>
                  <td className={TD}>{q.average_score === null ? "—" : `${q.average_score}%`}</td>
                  <td className={TD}>{q.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/** Kajabi's Assessments: chapter checkpoints, surveys and the public quiz in one place. */
export default async function AssessmentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireStaff("content");
  const { error } = await searchParams;
  const sb = createServiceClient();
  const [stats, surveys, chapters] = await Promise.all([
    loadQuizStats(),
    loadSurveyList(sb).catch((e: unknown) => {
      console.error("[assessments] surveys failed", { error: e instanceof Error ? e.message : String(e) });
      return null;
    }),
    sb.from("courses").select("id, title"),
  ]);
  const chapterTitle = new Map((chapters.data ?? []).map((c) => [c.id as string, c.title as string]));

  return (
    <>
      <PageHeader
        title="Assessments"
        description="Checkpoints inside chapters, surveys for members, and the quiz on the website."
        actions={
          <form action={createSurvey}>
            <button type="submit" className={BTN_PRIMARY}>
              New survey
            </button>
          </form>
        }
      />
      {error && <Notice tone="error">Couldn&apos;t create the survey. Try again.</Notice>}
      <div className="flex flex-col gap-6">
        <Card flush title="Surveys" description="Questions without a right answer: check-ins, feedback, getting to know the dogs. Answers are saved on each member.">
          {surveys === null ? (
            <p className="px-5 pb-5 text-[14px] text-[#a4262c]">Couldn&apos;t load the surveys.</p>
          ) : surveys.length === 0 ? (
            <div className="px-5 pb-5">
              <EmptyState title="No surveys yet">Ask members how a chapter went, or what they&apos;d like next.</EmptyState>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className={TABLE}>
                <thead className={THEAD}>
                  <tr>
                    <th className={TH}>Survey</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Shown</th>
                    <th className={TH}>Answers</th>
                    <th className={TH}>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {surveys.map((s) => (
                    <tr key={s.id} className={TROW}>
                      <td className={TD}>
                        <Link href={`/admin/assessments/surveys/${s.id}`} className="font-medium hover:underline">
                          {s.title}
                        </Link>
                        <p className={`text-[12px] ${MUTED}`}>{s.questions.length} questions</p>
                      </td>
                      <td className={TD}>
                        <StatusPill tone={STATUS[s.status].tone}>{STATUS[s.status].label}</StatusPill>
                      </td>
                      <td className={TD}>{s.courseId ? `End of ${chapterTitle.get(s.courseId) ?? "a chapter"}` : "By link"}</td>
                      <td className={TD}>{s.responses}</td>
                      <td className={TD}>{shortDate(s.updatedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <CheckpointsCard stats={stats} />

        <Card title="Website quiz" description="The quiz on bonded.dog that recommends a chapter and collects leads.">
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/assessments/lead-quiz" className={BTN_SECONDARY}>
              Edit questions and results
            </Link>
            <Link href="/admin/leads" className={BTN_SECONDARY}>
              See the leads
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
