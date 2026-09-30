import Link from "next/link";
import { notFound } from "next/navigation";
import { communityContext } from "@/lib/community/context";
import { loadPost } from "@/lib/community/queries";
import { PostCard } from "@/components/community/PostCard";
import { CommentThread } from "@/components/community/CommentThread";
import { CARD } from "@/components/community/bits";

export const dynamic = "force-dynamic";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await communityContext();
  if (!ctx.viewer.canAccess) return null;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const result = await loadPost(ctx.supabase, ctx.channels, ctx.viewer.userId, id);
  if (!result) notFound();
  const { post, comments } = result;
  const back = post.challengeId ? `/community/challenges/${post.challengeId}` : post.channel ? `/community/c/${post.channel.slug}` : "/community";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={back} className="inline-flex items-center gap-1 text-sm font-medium text-[#6c6a69] hover:text-[#1a1a19]">
        <span className="material-symbols-outlined text-[18px]" aria-hidden>
          arrow_back
        </span>
        Back
      </Link>
      <PostCard post={post} isStaff={ctx.viewer.isStaff} expanded />
      <div className={`${CARD} p-5`}>
        <h2 className="mb-4 font-semibold">
          {post.commentCount} {post.commentCount === 1 ? "comment" : "comments"}
        </h2>
        <CommentThread postId={post.id} comments={comments} locked={post.commentsLocked} isStaff={ctx.viewer.isStaff} me={ctx.me} />
      </div>
    </div>
  );
}
