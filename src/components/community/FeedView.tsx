import Link from "next/link";
import type { CommunityContext } from "@/lib/community/context";
import { postableChannels } from "@/lib/community/context";
import { loadFeed, loadMembers, type ChannelRow, type FeedSort, type PostView } from "@/lib/community/queries";
import { Composer } from "./Composer";
import { PostCard } from "./PostCard";
import { CARD } from "./bits";
import { Avatar, TimeAgo } from "./bits";
import { LocalTime } from "@/components/ui/LocalTime";

type View = "feed" | "forum" | "gallery";

interface FeedViewProps {
  ctx: CommunityContext;
  channel: ChannelRow | null;
  view?: string;
  sort?: string;
}

function asView(value: string | undefined, fallback: View): View {
  return value === "feed" || value === "forum" || value === "gallery" ? value : fallback;
}

function ForumRow({ post }: { post: PostView }) {
  return (
    <Link href={`/community/posts/${post.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[#fafaf9]">
      <Avatar author={post.author} size={32} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{post.title || post.body.split("\n")[0]}</span>
        <span className="block text-xs text-[#6c6a69]">
          {post.author.name} · <TimeAgo iso={post.publishAt} />
          {post.channel ? ` · ${post.channel.name}` : ""}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-3 text-xs text-[#6c6a69]">
        <span className="inline-flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]" aria-hidden>
            chat_bubble
          </span>
          {post.commentCount}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]" aria-hidden>
            favorite
          </span>
          {post.likeCount}
        </span>
      </span>
    </Link>
  );
}

function Gallery({ posts }: { posts: readonly PostView[] }) {
  if (posts.length === 0) return <EmptyFeed text="No photos yet — share one!" />;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {posts.map((p) => (
        <Link key={p.id} href={`/community/posts/${p.id}`} className="group relative block overflow-hidden rounded-[12px] border border-[#e7e6e4] bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL from the private community bucket */}
          <img src={p.imageUrl ?? ""} alt={p.title ?? ""} className="aspect-square w-full object-cover transition-transform group-hover:scale-105" />
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 text-xs font-semibold text-white">
            {p.author.name} · ♥ {p.likeCount}
          </span>
        </Link>
      ))}
    </div>
  );
}

function EmptyFeed({ text }: { text: string }) {
  return (
    <div className={`${CARD} flex flex-col items-center px-6 py-12 text-center`}>
      <span className="material-symbols-outlined text-4xl text-[#b3b1ae]" aria-hidden>
        forum
      </span>
      <p className="mt-2 font-semibold">No posts found</p>
      <p className="text-sm text-[#6c6a69]">{text}</p>
    </div>
  );
}

async function RightRail({ ctx }: { ctx: CommunityContext }) {
  const now = new Date().toISOString();
  const [{ members, total }, meetupsRes, challengesRes] = await Promise.all([
    loadMembers(ctx.supabase, "", 8),
    ctx.supabase.from("community_meetups").select("id, title, starts_at").eq("canceled", false).gte("starts_at", now).order("starts_at").limit(3),
    ctx.supabase.from("community_challenges").select("id, title, ends_at").eq("published", true).gte("ends_at", now).order("starts_at").limit(3),
  ]);
  return (
    <aside className="hidden w-72 shrink-0 space-y-5 xl:block">
      <section className={`${CARD} p-4`}>
        <Link href="/community/members" className="flex items-center justify-between text-sm font-semibold hover:underline">
          All members <span className="text-[#6c6a69]">{total}</span>
        </Link>
        <div className="mt-3 flex -space-x-2">
          {members.map((m) => (
            <Link key={m.user_id} href={`/community/members/${m.user_id}`} className="rounded-full ring-2 ring-white" title={m.full_name ?? "Member"}>
              <Avatar author={{ id: m.user_id, name: m.full_name ?? "Member", avatarUrl: m.avatar_url }} size={32} />
            </Link>
          ))}
        </div>
      </section>
      <section className={`${CARD} p-4`}>
        <Link href="/community/meetups" className="flex items-center gap-2 text-sm font-semibold hover:underline">
          <span className="material-symbols-outlined text-[20px] text-[#0e666a]" aria-hidden>
            event
          </span>
          Meetups
        </Link>
        {(meetupsRes.data ?? []).length === 0 ? (
          <p className="mt-2 text-xs text-[#6c6a69]">No upcoming meetups.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {(meetupsRes.data ?? []).map((m) => (
              <li key={m.id}>
                <Link href={`/community/meetups/${m.id}`} className="block text-sm hover:underline">
                  <span className="font-medium">{m.title}</span>
                  <span className="block text-xs text-[#6c6a69]">
                    <LocalTime iso={m.starts_at} format="dateTime" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={`${CARD} p-4`}>
        <Link href="/community/challenges" className="flex items-center gap-2 text-sm font-semibold hover:underline">
          <span className="material-symbols-outlined text-[20px] text-[#ff8f00]" aria-hidden>
            emoji_events
          </span>
          Challenges
        </Link>
        {(challengesRes.data ?? []).length === 0 ? (
          <p className="mt-2 text-xs text-[#6c6a69]">No active challenges.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {(challengesRes.data ?? []).map((c) => (
              <li key={c.id}>
                <Link href={`/community/challenges/${c.id}`} className="text-sm font-medium hover:underline">
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}

/** Community home (all channels) or a single channel: composer, pinned posts, and Feed / Forum / Gallery. */
export async function FeedView({ ctx, channel, view, sort }: FeedViewProps) {
  const activeView = asView(view, channel?.default_view ?? "feed");
  const activeSort: FeedSort = sort === "active" ? "active" : "new";
  const base = channel ? `/community/c/${channel.slug}` : "/community";
  const canPost = channel ? ctx.viewer.isStaff || channel.posting === "members" : true;
  const postable = postableChannels(ctx.channels, ctx.viewer.isStaff);
  const moderated = !ctx.viewer.isStaff && Boolean(ctx.settings?.require_approval || channel?.requires_approval);

  const [pinned, posts] = await Promise.all([
    loadFeed(ctx.supabase, ctx.channels, ctx.viewer.userId, { channelId: channel?.id, pinned: true, limit: 20 }),
    loadFeed(ctx.supabase, ctx.channels, ctx.viewer.userId, {
      channelId: channel?.id,
      pinned: activeView === "feed" ? false : undefined,
      sort: activeSort,
      withImages: activeView === "gallery",
    }),
  ]);
  const link = (params: Record<string, string>) => `${base}?${new URLSearchParams({ view: activeView, sort: activeSort, ...params }).toString()}`;

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-4">
        {channel ? (
          <header className={`${CARD} p-5`}>
            <h1 className="flex items-center gap-2 text-xl font-bold">
              <span className="material-symbols-outlined text-[22px] text-[#0e666a]" aria-hidden>
                {channel.posting === "staff" ? "campaign" : "tag"}
              </span>
              {channel.name}
            </h1>
            {channel.description && <p className="mt-1 text-sm text-[#6c6a69]">{channel.description}</p>}
          </header>
        ) : ctx.settings?.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- community cover set by the team
          <img src={ctx.settings.cover_image_url} alt="" className="h-48 w-full rounded-[14px] object-cover sm:h-64" />
        ) : (
          <header className="rounded-[14px] bg-gradient-to-r from-[#0e666a] to-[#3fae8a] p-8 text-white">
            <h1 className="text-2xl font-bold">{ctx.settings?.name ?? "Community"}</h1>
            {ctx.settings?.description && <p className="mt-1 text-sm text-white/85">{ctx.settings.description}</p>}
          </header>
        )}

        {canPost && postable.length > 0 && (
          <Composer me={ctx.me} channels={postable} defaultChannelId={channel?.id ?? postable.find((c) => c.posting === "members")?.id ?? null} moderated={moderated} />
        )}

        {pinned.length > 0 && activeView === "feed" && (
          <details open className={`${CARD} group`}>
            <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3">
              <span>
                <span className="font-semibold">Pinned posts</span>
              </span>
              <span className="material-symbols-outlined transition-transform group-open:rotate-180" aria-hidden>
                expand_more
              </span>
            </summary>
            <div className="space-y-3 border-t border-[#f0efee] p-3">
              {pinned.map((p) => (
                <PostCard key={p.id} post={p} isStaff={ctx.viewer.isStaff} />
              ))}
            </div>
          </details>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <nav className="inline-flex rounded-full border border-[#e7e6e4] bg-white p-1 text-sm" aria-label="View">
            {(["feed", "forum", "gallery"] as const).map((v) => (
              <Link
                key={v}
                href={link({ view: v })}
                aria-current={v === activeView ? "page" : undefined}
                className={`rounded-full px-3 py-1 font-medium capitalize ${v === activeView ? "bg-[#1a1a19] text-white" : "text-[#6c6a69] hover:text-[#1a1a19]"}`}
              >
                {v}
              </Link>
            ))}
          </nav>
          <nav className="flex gap-3 text-sm" aria-label="Sort">
            <Link href={link({ sort: "new" })} className={activeSort === "new" ? "font-semibold" : "text-[#6c6a69] hover:text-[#1a1a19]"}>
              Newest first
            </Link>
            <Link href={link({ sort: "active" })} className={activeSort === "active" ? "font-semibold" : "text-[#6c6a69] hover:text-[#1a1a19]"}>
              Most active
            </Link>
          </nav>
        </div>

        {activeView === "gallery" ? (
          <Gallery posts={posts} />
        ) : posts.length === 0 ? (
          <EmptyFeed text="Create a post to get started." />
        ) : activeView === "forum" ? (
          <div className={`${CARD} divide-y divide-[#f0efee] overflow-hidden`}>
            {posts.map((p) => (
              <ForumRow key={p.id} post={p} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} isStaff={ctx.viewer.isStaff} />
            ))}
          </div>
        )}
      </div>
      {!channel && <RightRail ctx={ctx} />}
    </div>
  );
}
