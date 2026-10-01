import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/admin";
import { LocalTime } from "@/components/ui/LocalTime";
import { Card, EmptyState, StatusPill } from "@/app/admin/_components/ui";
import { loadMembers, MemberLink } from "@/app/admin/coaching/members";
import { ModerationActions } from "./ModerationActions";

/** Community → Moderation: posts waiting for approval and posts members reported (Kajabi's Review feed). */
const QUEUE_LIMIT = 50;
const EXCERPT_LENGTH = 280;

interface QueuedPost {
  id: string;
  title: string | null;
  body: string;
  status: string;
  report_count: number;
  created_at: string;
  author_id: string;
  channel_id: string | null;
}

async function loadModerationQueue() {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("community_posts")
    .select("id, title, body, status, report_count, created_at, author_id, channel_id")
    .or("status.eq.pending,report_count.gt.0")
    .neq("status", "removed")
    .order("created_at")
    .limit(QUEUE_LIMIT);
  if (error) console.error("[admin/community] moderation queue load failed", error.message);
  const posts = (data ?? []) as QueuedPost[];
  const ids = posts.map((p) => p.id);
  const [channelsRes, reportsRes, members] = await Promise.all([
    sb.from("community_channels").select("id, name"),
    ids.length ? sb.from("community_reports").select("post_id, reason").in("post_id", ids) : Promise.resolve({ data: [], error: null }),
    loadMembers(posts.map((p) => p.author_id)),
  ]);
  if (reportsRes.error) console.error("[admin/community] reports load failed", reportsRes.error.message);
  const channels = new Map(((channelsRes.data ?? []) as { id: string; name: string }[]).map((c) => [c.id, c.name]));
  const reasons = new Map<string, string[]>();
  for (const r of (reportsRes.data ?? []) as { post_id: string; reason: string | null }[]) {
    if (r.reason?.trim()) reasons.set(r.post_id, [...(reasons.get(r.post_id) ?? []), r.reason.trim()]);
  }
  return { posts, channels, reasons, members };
}

function excerpt(text: string): string {
  return text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH).trimEnd()}…` : text;
}

export async function ModerationTab() {
  const { posts, channels, reasons, members } = await loadModerationQueue();
  return (
    <Card flush title="Moderation" description="Posts waiting for approval and posts members reported. Approved posts appear in the feed straight away.">
      {posts.length === 0 ? (
        <EmptyState title="All clear — nothing to review." />
      ) : (
        <ul className="divide-y divide-[#efeeed] border-t border-[#efeeed]">
          {posts.map((p) => {
            const pending = p.status === "pending";
            return (
              <li key={p.id} className="grid gap-3 px-5 py-4 md:grid-cols-[14rem_minmax(0,1fr)]">
                <div className="min-w-0 space-y-1 text-sm">
                  <MemberLink member={members.get(p.author_id)} />
                  <p className="text-xs text-[#6c6a69]">
                    <LocalTime iso={p.created_at} format="dateTime" />
                    {p.channel_id && channels.get(p.channel_id) ? ` · # ${channels.get(p.channel_id)}` : ""}
                  </p>
                </div>
                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {pending && <StatusPill tone="warning">Waiting for approval</StatusPill>}
                    {p.report_count > 0 && (
                      <StatusPill tone="danger">
                        Reported {p.report_count} {p.report_count === 1 ? "time" : "times"}
                      </StatusPill>
                    )}
                  </div>
                  {p.title && <p className="font-medium text-[#1a1a19]">{p.title}</p>}
                  <p className="whitespace-pre-wrap text-sm text-[#1a1a19]">{excerpt(p.body)}</p>
                  {(reasons.get(p.id) ?? []).length > 0 && (
                    <ul className="space-y-1 rounded-[8px] bg-[#fafaf9] p-3 text-xs text-[#6c6a69]">
                      {(reasons.get(p.id) ?? []).map((reason, i) => (
                        <li key={i}>“{reason}”</li>
                      ))}
                    </ul>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <ModerationActions postId={p.id} actions={pending ? ["approve", "remove"] : ["dismiss_reports", "remove"]} />
                    {!pending && (
                      <Link href={`/community/posts/${p.id}`} target="_blank" className="text-sm text-[#6c6a69] hover:underline">
                        View in community ↗
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
