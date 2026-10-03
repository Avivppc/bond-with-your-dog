import { requireStaff } from "@/lib/admin";
import { loadQuizConfigWithSource, type QuizConfigSource } from "@/lib/quiz/config-server";
import { BTN_SECONDARY, MUTED, Notice, PageHeader } from "../../_components/ui";
import { shortDate } from "../../_components/list-kit";
import { ConfirmSubmit } from "../../_components/ConfirmSubmit";
import { resetLeadQuiz } from "./actions";
import LeadQuizEditor from "./LeadQuizEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lead quiz" };

interface PageProps {
  searchParams: Promise<{ saved?: string; reset?: string; error?: string }>;
}

function sourceNote(source: QuizConfigSource, updatedAt: string | null): string {
  switch (source) {
    case "saved":
      return `Last saved ${shortDate(updatedAt)}.`;
    case "invalid":
      return "The saved version couldn't be read, so visitors see the original quiz. Saving here replaces it.";
    case "unavailable":
      return "Couldn't load the saved quiz right now. Showing the original. Reload before you edit.";
    default:
      return "Visitors see the original quiz. Your first save replaces it.";
  }
}

/** The public quiz at /quiz: its questions and what each result says. */
export default async function LeadQuizPage({ searchParams }: PageProps) {
  await requireStaff("content");
  const { saved, reset, error } = await searchParams;
  const { config, source, updatedAt } = await loadQuizConfigWithSource();

  return (
    <>
      <PageHeader
        title="Lead quiz"
        crumbs={[{ label: "Assessments", href: "/admin/assessments" }, { label: "Lead quiz" }]}
        description="The quiz visitors take to find their chapter. Edit the questions and what each result says."
        actions={
          <>
            <a href="/quiz" target="_blank" rel="noopener noreferrer" className={BTN_SECONDARY}>
              Preview the quiz
            </a>
            {source !== "original" && (
              <form action={resetLeadQuiz}>
                <ConfirmSubmit
                  className={BTN_SECONDARY}
                  message="Reset to the original quiz? Your changes to the questions and results will be removed."
                >
                  Reset to the original quiz
                </ConfirmSubmit>
              </form>
            )}
          </>
        }
      />
      <div className="mb-6 flex flex-col gap-3">
        {saved && <Notice tone="success">Quiz saved. Visitors see the new version now.</Notice>}
        {reset && <Notice tone="success">The original quiz is back.</Notice>}
        {typeof error === "string" && <Notice tone="error">{error}</Notice>}
        <p className={`text-[14px] ${MUTED}`}>{sourceNote(source, updatedAt)}</p>
      </div>
      <LeadQuizEditor key={updatedAt ?? source} initial={config} />
    </>
  );
}
