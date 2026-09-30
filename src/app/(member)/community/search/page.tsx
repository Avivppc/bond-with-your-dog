import { communityContext } from "@/lib/community/context";
import { loadFeed } from "@/lib/community/queries";
import { CARD, FIELD } from "@/components/community/bits";
import { PostCard } from "@/components/community/PostCard";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const ctx = await communityContext();
  if (!ctx.viewer.canAccess) return null;
  const q = (await searchParams).q?.trim().slice(0, 100) ?? "";
  const posts = q ? await loadFeed(ctx.supabase, ctx.channels, ctx.viewer.userId, { search: q, limit: 30 }) : [];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">Search</h1>
      <form>
        <input name="q" defaultValue={q} autoFocus placeholder="Search posts…" aria-label="Search posts" className={FIELD} />
      </form>
      {q && posts.length === 0 && <div className={`${CARD} p-8 text-center text-sm text-[#6c6a69]`}>No posts match “{q}”.</div>}
      {posts.map((p) => (
        <PostCard key={p.id} post={p} isStaff={ctx.viewer.isStaff} />
      ))}
    </div>
  );
}
