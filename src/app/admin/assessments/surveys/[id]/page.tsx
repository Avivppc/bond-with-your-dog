import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { loadResponses, loadSurvey, type SurveyResponseRow } from "@/lib/surveys/server";
import { summarize, type QuestionSummary, type SurveyQuestion } from "@/lib/surveys/survey";
import { BTN_DANGER, Card, MUTED, PageHeader, TABLE, TD, TH, THEAD, TROW } from "../../../_components/ui";
import { shortDate } from "../../../_components/list-kit";
import { ConfirmSubmit } from "../../../_components/ConfirmSubmit";
import { deleteSurvey } from "../../actions";
import { SurveyEditor } from "./SurveyEditor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Survey" };

function Bars({ counts, total }: { counts: Record<string, number>; total: number }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {Object.entries(counts).map(([label, n]) => (
        <li key={label} className="grid grid-cols-[minmax(0,180px)_1fr_auto] items-center gap-3 text-[13px]">
          <span className="truncate">{label}</span>
          <span className="h-2 rounded-full bg-[#efeeed]">
            <span className="block h-2 rounded-full bg-[#0e666a]" style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
          </span>
          <span className={MUTED}>{n}</span>
        </li>
      ))}
    </ul>
  );
}

function SummaryBlock({ s }: { s: QuestionSummary }) {
  return (
    <div className="flex flex-col gap-2 border-b border-[#efeeed] pb-4 last:border-0 last:pb-0">
      <p className="font-medium">{s.prompt}</p>
      <p className={`text-[12px] ${MUTED}`}>{s.answered} answered</p>
      {s.type === "rating" && s.counts && (
        <>
          <p className="text-[20px] font-semibold">{s.average} / 5</p>
          <Bars counts={s.counts} total={s.answered} />
        </>
      )}
      {(s.type === "single" || s.type === "multi") && s.counts && <Bars counts={s.counts} total={s.answered} />}
      {s.texts && (s.texts.length === 0 ? <p className={`text-[13px] ${MUTED}`}>No answers yet.</p> : (
        <ul className="flex max-h-64 flex-col gap-1.5 overflow-y-auto">
          {s.texts.map((t, i) => (
            <li key={i} className="rounded-[8px] bg-[#f8f8f7] px-3 py-2 text-[13px]">
              {t}
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}

function answerText(q: SurveyQuestion, r: SurveyResponseRow): string {
  const a = r.answers[q.id];
  if (a === undefined) return "—";
  return Array.isArray(a) ? a.join(", ") : String(a);
}

const Id = z.string().uuid();

export default async function SurveyPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("content");
  const { id } = await params;
  if (!Id.safeParse(id).success) notFound();
  const sb = createServiceClient();
  const [survey, responses, chaptersRes] = await Promise.all([
    loadSurvey(sb, id),
    loadResponses(sb, id),
    sb.from("courses").select("id, title").not("chapter_number", "is", null).order("chapter_number"),
  ]);
  if (!survey) notFound();
  const chapters = (chaptersRes.data ?? []).map((c) => ({ id: c.id as string, title: c.title as string }));
  const userIds = [...new Set(responses.map((r) => r.userId))];
  const { data: profiles } = userIds.length ? await sb.from("profiles").select("id, full_name").in("id", userIds.slice(0, 500)) : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id as string, (p.full_name as string) || "Member"]));
  const summary = summarize(survey.questions, responses.map((r) => r.answers));
  const recent = responses.slice(0, 100);

  return (
    <>
      <PageHeader title={survey.title} crumbs={[{ label: "Assessments", href: "/admin/assessments" }, { label: survey.title }]} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <SurveyEditor
          id={survey.id}
          initial={{ title: survey.title, intro: survey.intro, thankYou: survey.thankYou, questions: survey.questions }}
          status={survey.status}
          courseId={survey.courseId}
          chapters={chapters}
          hasResponses={responses.length > 0}
        />
        <Card title="Results" description={`${responses.length} ${responses.length === 1 ? "member" : "members"} answered`}>
          <div className="flex flex-col gap-4">
            {summary.map((s) => (
              <SummaryBlock key={s.id} s={s} />
            ))}
          </div>
        </Card>
      </div>

      {recent.length > 0 && (
        <div className="mt-6">
          <Card flush title="Answers" description={responses.length > recent.length ? `The latest ${recent.length}.` : undefined}>
            <div className="relative overflow-x-auto">
              <table className={TABLE}>
                <thead className={THEAD}>
                  <tr>
                    <th className={TH}>Member</th>
                    <th className={TH}>When</th>
                    {survey.questions.map((q) => (
                      <th key={q.id} className={TH}>
                        {q.prompt}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.userId} className={TROW}>
                      <td className={TD}>
                        <Link href={`/admin/people/${r.userId}`} className="hover:underline">
                          {names.get(r.userId) ?? "Member"}
                        </Link>
                      </td>
                      <td className={TD}>{shortDate(r.createdAt)}</td>
                      {survey.questions.map((q) => (
                        <td key={q.id} className={`${TD} max-w-[280px] whitespace-pre-wrap`}>
                          {answerText(q, r)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      <form action={deleteSurvey} className="mt-6">
        <input type="hidden" name="id" value={survey.id} />
        <ConfirmSubmit className={BTN_DANGER} message="Delete this survey and all its answers?">
          Delete survey
        </ConfirmSubmit>
      </form>
    </>
  );
}
