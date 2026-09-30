import { communityContext } from "@/lib/community/context";
import { FeedView } from "@/components/community/FeedView";

export const dynamic = "force-dynamic";

export default async function CommunityHome({ searchParams }: { searchParams: Promise<{ view?: string; sort?: string }> }) {
  const ctx = await communityContext();
  if (!ctx.viewer.canAccess) return null;
  const { view, sort } = await searchParams;
  return <FeedView ctx={ctx} channel={null} view={view} sort={sort} />;
}
