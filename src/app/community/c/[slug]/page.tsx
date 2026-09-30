import { notFound } from "next/navigation";
import { communityContext } from "@/lib/community/context";
import { FeedView } from "@/components/community/FeedView";

export const dynamic = "force-dynamic";

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ view?: string; sort?: string }>;
}) {
  const ctx = await communityContext();
  if (!ctx.viewer.canAccess) return null;
  const { slug } = await params;
  const channel = ctx.channels.find((c) => c.slug === slug);
  if (!channel) notFound();
  const { view, sort } = await searchParams;
  return <FeedView ctx={ctx} channel={channel} view={view} sort={sort} />;
}
