import { notFound } from "next/navigation";
import { communityContext } from "@/lib/community/context";
import { LocalTime } from "@/components/ui/LocalTime";
import { loadQueue } from "@/lib/community/queries";
import { CARD } from "@/components/community/bits";
import { PostCard } from "@/components/community/PostCard";
import { ModerationButtons, ScheduleForm } from "@/components/community/StaffTools";

export const dynamic = "force-dynamic";

export default async function ScheduledPage() {
  const ctx = await communityContext();
  if (!ctx.viewer.canAccess) return null;
  if (!ctx.viewer.isStaff) notFound();
  const posts = await loadQueue(ctx.supabase, ctx.channels, ctx.viewer.userId, "scheduled");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Scheduled posts</h1>
        <p className="text-sm text-[#6c6a69]">Posts go live automatically at their time.</p>
      </header>
      <ScheduleForm channels={ctx.channels} />
      {posts.length === 0 ? (
        <div className={`${CARD} p-8 text-center text-sm text-[#6c6a69]`}>Nothing scheduled.</div>
      ) : (
        posts.map((p) => (
          <div key={p.id} className="space-y-2">
            <p className="text-xs font-semibold text-[#3b2fa8]">
              Goes live <LocalTime iso={p.publishAt} format="dateTime" zoneLabel />
            </p>
            <PostCard post={p} isStaff />
            <ModerationButtons postId={p.id} actions={["publish_now", "remove"]} />
          </div>
        ))
      )}
    </div>
  );
}
