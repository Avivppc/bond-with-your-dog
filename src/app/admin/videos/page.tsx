import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/admin";
import { requireStaff } from "@/lib/admin";
import { BTN_PRIMARY, BTN_SECONDARY, EmptyState, Notice, PageHeader, StatusPill } from "../_components/ui";
import { shortDate } from "../_components/list-kit";
import { ConfirmSubmit } from "../_components/ConfirmSubmit";
import { approveVideo, unapproveVideo, deleteVideo } from "./actions";

export const dynamic = "force-dynamic";

interface VideoRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  mux_playback_id: string | null;
  is_public: boolean;
  approved: boolean;
  created_at: string;
}

interface Submitter {
  email: string | null;
  name: string | null;
}

async function loadSubmitters(userIds: string[]): Promise<Map<string, Submitter>> {
  if (userIds.length === 0) return new Map();
  const sb = createServiceClient();
  const [emails, profiles] = await Promise.all([
    sb.rpc("admin_user_emails", { p_user_ids: userIds }),
    sb.from("profiles").select("id, full_name").in("id", userIds),
  ]);
  if (emails.error) console.error("[videos] email lookup failed", emails.error.message);
  if (profiles.error) console.error("[videos] profile lookup failed", profiles.error.message);
  const emailOf = new Map(((emails.data ?? []) as { user_id: string; email: string }[]).map((u) => [u.user_id, u.email]));
  const nameOf = new Map((profiles.data ?? []).map((p) => [p.id as string, p.full_name as string | null]));
  return new Map(userIds.map((id) => [id, { email: emailOf.get(id) ?? null, name: nameOf.get(id) ?? null }]));
}

function VideoCard({ video, submitter }: { video: VideoRow; submitter: Submitter | undefined }) {
  const live = video.is_public && video.approved;
  return (
    <li className="overflow-hidden rounded-[12px] border border-[#e7e6e4] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      {video.mux_playback_id && (
        <div className="aspect-video bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element -- Mux thumbnail */}
          <img src={`https://image.mux.com/${video.mux_playback_id}/thumbnail.jpg?width=640&fit_mode=preserve`} alt={video.title} className="h-full w-full object-cover" />
        </div>
      )}
      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-semibold">{video.title}</h3>
            <p className="text-[12px] text-[#6c6a69]">
              {shortDate(video.created_at)} ·{" "}
              <Link href={`/admin/people/${video.user_id}`} className="font-medium text-[#1a1a19] hover:underline">
                {submitter?.name || submitter?.email || "Unknown member"}
              </Link>
              {submitter?.name && submitter.email && <span> ({submitter.email})</span>}
            </p>
          </div>
          <StatusPill tone={live ? "published" : "warning"}>{live ? "On /spotlight" : "Pending"}</StatusPill>
        </div>
        {video.description && <p className="line-clamp-3 text-[14px] text-[#6c6a69]">{video.description}</p>}
        <div className="flex flex-wrap items-center gap-2 border-t border-[#efeeed] pt-3">
          <form action={live ? unapproveVideo : approveVideo}>
            <input type="hidden" name="id" value={video.id} />
            <button type="submit" className={live ? BTN_SECONDARY : BTN_PRIMARY}>
              {live ? "Remove from Spotlight" : "Approve & feature"}
            </button>
          </form>
          <form action={deleteVideo}>
            <input type="hidden" name="id" value={video.id} />
            <ConfirmSubmit message={`Delete "${video.title}"? This can't be undone.`} className="rounded-full px-3 py-2 text-[14px] font-medium text-red-700 hover:bg-red-50">
              Delete
            </ConfirmSubmit>
          </form>
        </div>
      </div>
    </li>
  );
}

export default async function AdminVideosPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireStaff("content");
  const { ok, error } = await searchParams;
  const { data, error: loadError } = await createServiceClient()
    .from("student_videos")
    .select("id, user_id, title, description, mux_playback_id, is_public, approved, created_at")
    .eq("consent_public", true)
    .eq("status", "ready")
    .order("created_at", { ascending: false });
  if (loadError) console.error("[videos] list failed", loadError.message);
  const videos = (data ?? []) as VideoRow[];
  const submitters = await loadSubmitters([...new Set(videos.map((v) => v.user_id))]);

  return (
    <div>
      <PageHeader
        title="Member Spotlight"
        crumbs={[{ label: "Inbox", href: "/admin/inbox" }, { label: "Spotlight videos" }]}
        description="Videos members submitted with permission to share. Approve one to feature it on the public /spotlight page."
      />
      <div className="space-y-4">
        {typeof ok === "string" && <Notice tone="success">{ok}</Notice>}
        {typeof error === "string" && <Notice tone="error">{error}</Notice>}
        {videos.length === 0 ? (
          <div className="rounded-[12px] border border-[#e7e6e4] bg-white">
            <EmptyState title="No videos awaiting review." />
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {videos.map((v) => (
              <VideoCard key={v.id} video={v} submitter={submitters.get(v.user_id)} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
