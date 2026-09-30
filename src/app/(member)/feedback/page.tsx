import Link from "next/link";
import { requireMember } from "@/lib/member/viewer";
import { createClient } from "@/lib/supabase/server";
import { Ms, Sketch } from "@/components/app/ui";
import { LocalTime } from "@/components/ui/LocalTime";
import { settleUploads, type UploadingRow } from "@/lib/feedback/upload-server";
import { feedbackCountsLine, inTab, parseFeedbackTab, type FeedbackStatus } from "@/lib/feedback/status";
import { QueryTabs } from "./_components/QueryTabs";
import { UrlToast } from "./_components/Toast";
import { RefreshWhileProcessing } from "./_components/RefreshWhileProcessing";
import { FeedbackCard, type FeedbackCardVideo } from "./_components/FeedbackCard";

export const metadata = { title: "Your videos" };

type Search = Promise<{ tab?: string }>;

const SENT_MESSAGES = { "1": "Video sent. Roni will reply in your Feedback tab." };

const TABS = [
  { value: "all", label: "All" },
  { value: "waiting", label: "Waiting" },
  { value: "replied", label: "Replied" },
];

const COLUMNS =
  "id, title, note, status, summary, member_read_at, created_at, duration_seconds, mux_playback_id, mux_upload_id, mux_asset_id, feedback_notes(count)";

type Row = Omit<FeedbackCardVideo, "notes"> & UploadingRow & { feedback_notes: { count: number }[] };

async function loadVideos(): Promise<Row[]> {
  const supabase = await createClient();
  const load = () => supabase.from("feedback_videos").select(COLUMNS).order("created_at", { ascending: false }).returns<Row[]>();
  const first = await load();
  if (first.error) console.error("[feedback] list load failed", first.error.message);
  const rows = first.data ?? [];
  // Nothing stays "processing" forever: check Mux for uploads still in flight, then reload.
  const settled = await settleUploads(rows);
  if (settled === 0) return rows;
  const again = await load();
  return again.data ?? rows;
}

export default async function FeedbackPage({ searchParams }: { searchParams: Search }) {
  await requireMember("/feedback");
  const { tab: tabParam } = await searchParams;
  const tab = parseFeedbackTab(tabParam);
  const rows = await loadVideos();
  const statuses = rows.map((r) => r.status as FeedbackStatus);
  const shown = rows.filter((r) => inTab(r.status, tab));
  const processing = rows.some((r) => r.status === "uploading");

  return (
    <>
      <div className="between">
        <div className="head-block">
          <span className="eyebrow">Feedback</span>
          <h1 className="h1">Your videos</h1>
          <p className="lede">{feedbackCountsLine(statuses)}</p>
        </div>
        <Link className="btn btn-primary" href="/feedback/new">
          <Ms name="videocam" size="sm" />
          Send a new video
        </Link>
      </div>
      {rows.length > 0 && <QueryTabs param="tab" tabs={TABS} current={tab} label="Filter videos" />}

      {rows.length === 0 ? (
        <div className="card state-card">
          <Sketch src="/app/img/take-a-selfie.jpg" size={96} imgSize={84} />
          <span className="eyebrow muted">Empty</span>
          <h2 className="h3">No videos yet</h2>
          <p className="faint">Send Roni a short clip and her notes will appear here.</p>
          <Link className="btn btn-ghost btn-sm" href="/feedback/new">
            Send a video
          </Link>
        </div>
      ) : shown.length === 0 ? (
        <div className="card state-card">
          <div className="big-ic">
            <Ms name={tab === "replied" ? "rate_review" : "hourglass_empty"} />
          </div>
          <span className="eyebrow muted">{tab === "replied" ? "No replies yet" : "Nothing waiting"}</span>
          <h2 className="h3">{tab === "replied" ? "Roni hasn't replied yet" : "Roni has replied to everything"}</h2>
          <p className="faint">
            {tab === "replied" ? "We'll notify you as soon as her notes are ready." : "Send another clip whenever you're ready."}
          </p>
        </div>
      ) : (
        <div className="stack">
          {shown.map((v) => (
            <FeedbackCard key={v.id} video={{ ...v, notes: v.feedback_notes?.[0]?.count ?? 0 }} sent={<LocalTime iso={v.created_at} format="shortDate" />} />
          ))}
        </div>
      )}
      <RefreshWhileProcessing active={processing} />
      <UrlToast param="sent" messages={SENT_MESSAGES} />
    </>
  );
}
