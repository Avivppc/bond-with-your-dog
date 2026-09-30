import { notFound } from "next/navigation";
import { communityContext } from "@/lib/community/context";
import { loadAuthors, loadFeed } from "@/lib/community/queries";
import { Avatar, CARD } from "@/components/community/bits";
import { PostCard } from "@/components/community/PostCard";

export const dynamic = "force-dynamic";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await communityContext();
  if (!ctx.viewer.canAccess) return null;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [authors, posts, pointsRes] = await Promise.all([
    loadAuthors(ctx.supabase, [id]),
    loadFeed(ctx.supabase, ctx.channels, ctx.viewer.userId, { authorId: id, limit: 20 }),
    ctx.supabase.rpc("community_member_points", { p_user_id: id }),
  ]);
  const person = authors.get(id);
  if (!person) notFound();
  const points = Number(pointsRes.data ?? 0);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className={`${CARD} flex items-center gap-4 p-6`}>
        <Avatar author={person} size={64} />
        <div>
          <h1 className="text-xl font-bold">{person.name}</h1>
          {person.dogName && <p className="text-sm text-[#6c6a69]">with {person.dogName} 🐾</p>}
          <p className="mt-1 text-sm font-semibold text-[#0e666a]">{Number(points).toLocaleString()} points</p>
        </div>
      </section>
      <h2 className="font-semibold">Posts</h2>
      {posts.length === 0 ? <p className="text-sm text-[#6c6a69]">No posts yet.</p> : posts.map((p) => <PostCard key={p.id} post={p} isStaff={ctx.viewer.isStaff} />)}
    </div>
  );
}
