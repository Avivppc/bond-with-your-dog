import { communityContext } from "@/lib/community/context";
import { memberViewer } from "@/lib/member/viewer";
import { FeedView } from "@/components/community/FeedView";
import { Hub } from "./Hub";

export const dynamic = "force-dynamic";

export default async function CommunityHome({ searchParams }: { searchParams: Promise<{ view?: string; sort?: string }> }) {
  const [ctx, viewer] = await Promise.all([communityContext(), memberViewer()]);
  if (!ctx.viewer.canAccess) return null;
  const { view, sort } = await searchParams;
  return (
    <>
      <Hub ctx={ctx} whatsappUrl={ctx.settings?.whatsapp_url ?? null} dogName={viewer?.activeDog?.name ?? null} />
      <FeedView ctx={ctx} channel={null} view={view} sort={sort} />
    </>
  );
}
