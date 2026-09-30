import { notFound } from "next/navigation";
import { communityContext } from "@/lib/community/context";
import { loadQueue } from "@/lib/community/queries";
import { CARD } from "@/components/community/bits";
import { PostCard } from "@/components/community/PostCard";
import { ModerationButtons } from "@/components/community/StaffTools";

export const dynamic = "force-dynamic";

/** Kajabi "Review feed": posts waiting for approval and posts members reported. */
export default async function ReviewPage() {
  const ctx = await communityContext();
  if (!ctx.viewer.canAccess) return null;
  if (!ctx.viewer.isStaff) notFound();
  const posts = await loadQueue(ctx.supabase, ctx.channels, ctx.viewer.userId, "review");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Review feed</h1>
        <p className="text-sm text-[#6c6a69]">Posts waiting for approval and posts members reported.</p>
      </header>
      {posts.length === 0 ? (
        <div className={`${CARD} p-10 text-center text-sm text-[#6c6a69]`}>All clear — nothing to review.</div>
      ) : (
        posts.map((p) => (
          <div key={p.id} className="space-y-2">
            <PostCard post={p} isStaff />
            <ModerationButtons postId={p.id} actions={p.status === "pending" ? ["approve", "remove"] : ["dismiss_reports", "remove"]} />
          </div>
        ))
      )}
    </div>
  );
}
