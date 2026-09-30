import Link from "next/link";
import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { paginate, parsePage } from "@/lib/content/pagination";
import { LocalTime } from "@/components/ui/LocalTime";
import { BTN_SECONDARY, Card, EmptyState, Notice, PageHeader, Tabs, type TabItem } from "@/app/admin/_components/ui";
import { loadMembers, MemberLink, type MemberInfo } from "../members";
import { AnswerForm, EditableAnswer } from "./AnswerForm";
import { setQuestionHidden } from "./actions";
import { asQuestionTab, QUESTION_TABS, type QuestionTab } from "./tabs";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const BASE = "/admin/coaching/questions";
const TAB_LABELS: Record<QuestionTab, string> = { unanswered: "Unanswered", answered: "Answered", hidden: "Hidden" };
const NOTICES: Record<string, string> = { hidden: "Question hidden from members.", shown: "Question visible to members again." };

interface QuestionRow {
  id: string;
  body: string;
  answer: string | null;
  answered_at: string | null;
  answered_by: string | null;
  hidden: boolean;
  created_at: string;
  user_id: string;
  lesson_id: string;
  lessons: { title: string; course_id: string; courses: { title: string } | null } | null;
}

type ServiceClient = ReturnType<typeof createServiceClient>;

/** PostgREST filters per tab, shared by the tab counts and the page query. */
const TAB_FILTERS: Record<QuestionTab, readonly (readonly [column: string, operator: string, value: string])[]> = {
  unanswered: [
    ["hidden", "eq", "false"],
    ["answer", "is", "null"],
  ],
  answered: [
    ["hidden", "eq", "false"],
    ["answer", "not.is", "null"],
  ],
  hidden: [["hidden", "eq", "true"]],
};

async function countTab(sb: ServiceClient, tab: QuestionTab): Promise<number> {
  let query = sb.from("lesson_questions").select("id", { count: "exact", head: true });
  for (const [column, operator, value] of TAB_FILTERS[tab]) query = query.filter(column, operator, value);
  const { count, error } = await query;
  if (error) console.error("[admin/coaching] question count failed", { tab, error: error.message });
  return count ?? 0;
}

export default async function LessonQuestionsPage({ searchParams }: { searchParams: Promise<{ tab?: string; page?: string; notice?: string; error?: string }> }) {
  await requireStaff("content");
  const params = await searchParams;
  const tab = asQuestionTab(params.tab);
  const sb = createServiceClient();

  const counts = await Promise.all(QUESTION_TABS.map((t) => countTab(sb, t)));
  const countOf = Object.fromEntries(QUESTION_TABS.map((t, i) => [t, counts[i]])) as Record<QuestionTab, number>;
  const pager = paginate(parsePage(params.page), PAGE_SIZE, countOf[tab]);

  let query = sb.from("lesson_questions").select("id, body, answer, answered_at, answered_by, hidden, created_at, user_id, lesson_id, lessons(title, course_id, courses(title))");
  for (const [column, operator, value] of TAB_FILTERS[tab]) query = query.filter(column, operator, value);
  const { data, error } = await query
    .order(tab === "answered" ? "answered_at" : "created_at", { ascending: tab === "unanswered" })
    .range(pager.from, pager.to);
  if (error) console.error("[admin/coaching] questions load failed", { tab, error: error.message });
  const rows = (data ?? []) as unknown as QuestionRow[];
  const members = await loadMembers(rows.flatMap((r) => (r.answered_by ? [r.user_id, r.answered_by] : [r.user_id])));

  const tabs: TabItem[] = QUESTION_TABS.map((t) => ({ key: t, label: `${TAB_LABELS[t]} (${countOf[t]})`, href: `${BASE}?tab=${t}` }));
  const pageHref = (page: number) => `${BASE}?tab=${tab}&page=${page}`;

  return (
    <div className="space-y-6">
      <PageHeader title="Lesson questions" description="Questions members ask under a lesson. Answers appear on the lesson's Questions tab." />
      <Tabs items={tabs} active={tab} />
      {params.notice && NOTICES[params.notice] && <Notice tone="success">{NOTICES[params.notice]}</Notice>}
      {params.error && <Notice tone="error">{params.error}</Notice>}
      <Card flush>
        {rows.length === 0 ? (
          <EmptyState title={tab === "unanswered" ? "You're all caught up." : `No ${TAB_LABELS[tab].toLowerCase()} questions.`} />
        ) : (
          <ul className="-mt-4 divide-y divide-[#efeeed]">
            {rows.map((q) => (
              <QuestionItem key={q.id} question={q} members={members} tab={tab} page={pager.page} />
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#efeeed] px-5 py-3 text-sm text-[#6c6a69]">
          <span>{pager.label}</span>
          <div className="flex gap-2">
            {pager.page > 1 && (
              <Link href={pageHref(pager.page - 1)} className={BTN_SECONDARY}>
                Previous
              </Link>
            )}
            {pager.page < pager.pages && (
              <Link href={pageHref(pager.page + 1)} className={BTN_SECONDARY}>
                Next
              </Link>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function QuestionItem({ question: q, members, tab, page }: { question: QuestionRow; members: Map<string, MemberInfo>; tab: QuestionTab; page: number }) {
  const lesson = q.lessons;
  const answeredBy = q.answered_by ? members.get(q.answered_by) : undefined;
  return (
    <li className="grid gap-4 px-5 py-4 md:grid-cols-[14rem_minmax(0,1fr)]">
      <div className="min-w-0 space-y-1 text-sm">
        <MemberLink member={members.get(q.user_id)} />
        <p className="text-xs text-[#6c6a69]">
          <LocalTime iso={q.created_at} format="dateTime" />
        </p>
      </div>
      <div className="min-w-0 space-y-3">
        {lesson && (
          <p className="text-xs text-[#6c6a69]">
            <Link href={`/admin/courses/${lesson.course_id}`} className="hover:underline">
              {lesson.courses?.title ?? "Course"}
            </Link>
            {" › "}
            <Link href={`/learn/${lesson.course_id}/${q.lesson_id}?tab=questions`} target="_blank" className="font-medium text-[#1a1a19] hover:underline">
              {lesson.title}
            </Link>
          </p>
        )}
        <p className="whitespace-pre-wrap text-sm font-medium text-[#1a1a19]">{q.body}</p>
        <div className="rounded-[12px] bg-[#fafaf9] p-3">
          {q.answer ? (
            <div className="space-y-1">
              <EditableAnswer questionId={q.id} answer={q.answer} />
              <p className="text-xs text-[#6c6a69]">
                Answered{answeredBy ? ` by ${answeredBy.name ?? answeredBy.email ?? "the team"}` : ""}
                {q.answered_at && (
                  <>
                    {" · "}
                    <LocalTime iso={q.answered_at} format="dateTime" />
                  </>
                )}
              </p>
            </div>
          ) : (
            <AnswerForm questionId={q.id} initialAnswer="" editing={false} />
          )}
        </div>
        <form action={setQuestionHidden}>
          <input type="hidden" name="id" value={q.id} />
          <input type="hidden" name="hidden" value={q.hidden ? "false" : "true"} />
          <input type="hidden" name="tab" value={tab} />
          <input type="hidden" name="page" value={page} />
          <button type="submit" className="inline-flex items-center gap-1 text-xs font-medium text-[#6c6a69] hover:text-[#1a1a19]">
            <span className="material-symbols-outlined text-[16px]" aria-hidden>
              {q.hidden ? "visibility" : "visibility_off"}
            </span>
            {q.hidden ? "Show to members again" : "Hide from members"}
          </button>
        </form>
      </div>
    </li>
  );
}
