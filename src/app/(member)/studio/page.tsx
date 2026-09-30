import { requireStaff } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/admin";
import { memberViewer } from "@/lib/member/viewer";
import { Ms } from "@/components/app/ui";
import { loadQueue, loadReviewDetail, loadStudioStats, settleStaleUploads, type StudioTab } from "@/lib/feedback/studio";
import { EMAIL_OUTCOME_NOTE } from "@/lib/feedback/email-outcome";
import { QueryTabs } from "../feedback/_components/QueryTabs";
import { UrlToast } from "../feedback/_components/Toast";
import { Greeting } from "./Greeting";
import { StudioQueue } from "./StudioQueue";
import { ReviewPanel } from "./ReviewPanel";

export const metadata = { title: "Roni's Studio" };

type Search = Promise<{ q?: string; id?: string }>;

const SENT_MESSAGES = Object.fromEntries(
  Object.entries(EMAIL_OUTCOME_NOTE).map(([outcome, note]) => [outcome, `Feedback sent. The member was notified ${note}.`])
);

const TABS = [
  { value: "waiting", label: "Waiting" },
  { value: "done", label: "Done" },
];

export default async function StudioPage({ searchParams }: { searchParams: Search }) {
  await requireStaff("content");
  const viewer = await memberViewer();
  const { q, id } = await searchParams;
  const tab: StudioTab = q === "done" ? "done" : "waiting";
  const sb = createServiceClient();

  await settleStaleUploads(sb);
  const [stats, videos] = await Promise.all([loadStudioStats(sb), loadQueue(sb, tab)]);
  const selected = videos.find((v) => v.id === id) ?? videos[0] ?? null;
  const detail = selected ? await loadReviewDetail(sb, selected) : null;
  const now = new Date();

  return (
    <>
      <div className="studio-banner">
        <Ms name="verified_user" fill />
        Roni&apos;s Studio · only you and your team see this view
      </div>
      <div className="between">
        <div className="head-block">
          <span className="eyebrow">Studio</span>
          <h1 className="h1">
            <Greeting name={viewer?.firstName ?? "Roni"} />
          </h1>
        </div>
        <div className="row" style={{ gap: 28 }}>
          <div className="stat">
            <b>{stats.waiting}</b>
            <span>Videos waiting</span>
          </div>
          <div className="stat">
            <b>{stats.stories}</b>
            <span>Stories to approve</span>
          </div>
          <div className="stat">
            <b>{stats.questions}</b>
            <span>Q&amp;A questions</span>
          </div>
        </div>
      </div>
      <div className="grid-7-5">
        <div className="card">
          <div className="card-head">
            <h2 className="h3">Review queue</h2>
            <QueryTabs param="q" tabs={TABS} current={tab} label="Review queue" />
          </div>
          <StudioQueue videos={videos} tab={tab} selectedId={selected?.id ?? null} now={now} />
        </div>
        {selected && detail ? (
          <ReviewPanel key={selected.id} video={selected} detail={detail} />
        ) : (
          <div className="card state-card">
            <div className="big-ic" style={{ background: "var(--teal-soft)", color: "var(--teal)" }}>
              <Ms name="task_alt" />
            </div>
            <span className="eyebrow muted">All caught up</span>
            <h2 className="h3">{tab === "waiting" ? "No videos to review" : "No sent feedback yet"}</h2>
            <p className="faint">Members&apos; videos land here as soon as they finish uploading.</p>
          </div>
        )}
      </div>
      <UrlToast param="sent" messages={SENT_MESSAGES} />
    </>
  );
}
