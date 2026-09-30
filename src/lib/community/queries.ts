import "server-only";
import type { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { pollResults, type PollResult } from "./format";

/**
 * Community reads. Everything goes through the member's own session, so RLS decides what is
 * visible (live posts, their own pending posts, staff see the queue). Only signed image URLs use
 * the service client, and only for rows RLS already returned.
 */
type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

export const COMMUNITY_MEDIA_BUCKET = "community-media";
const IMAGE_URL_TTL_SECONDS = 3600;
const FEED_LIMIT = 30;

export interface Author {
  id: string;
  name: string;
  dogName: string | null;
  avatarUrl: string | null;
}

export interface ChannelRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  default_view: "feed" | "forum" | "gallery";
  posting: "members" | "staff";
  requires_approval: boolean;
  position: number;
}

export interface CommunitySettings {
  name: string;
  description: string | null;
  cover_image_url: string | null;
  guidelines: string | null;
  open_to_students: boolean;
  require_approval: boolean;
}

export interface PostView {
  id: string;
  channel: Pick<ChannelRow, "id" | "name" | "slug"> | null;
  challengeId: string | null;
  author: Author;
  title: string | null;
  body: string;
  imageUrl: string | null;
  poll: (PollResult & { myVote: number | null }) | null;
  status: "published" | "pending" | "scheduled" | "removed";
  publishAt: string;
  pinned: boolean;
  commentsLocked: boolean;
  likeCount: number;
  commentCount: number;
  reportCount: number;
  liked: boolean;
  isMine: boolean;
}

export interface CommentView {
  id: string;
  parentId: string | null;
  author: Author;
  body: string;
  likeCount: number;
  liked: boolean;
  isMine: boolean;
  createdAt: string;
  replies: CommentView[];
}

interface PostRow {
  id: string;
  channel_id: string | null;
  challenge_id: string | null;
  author_id: string;
  title: string | null;
  body: string;
  image_path: string | null;
  poll_options: string[] | null;
  status: PostView["status"];
  publish_at: string;
  pinned: boolean;
  comments_locked: boolean;
  like_count: number;
  comment_count: number;
  report_count: number;
}

const POST_COLUMNS =
  "id, channel_id, challenge_id, author_id, title, body, image_path, poll_options, status, publish_at, pinned, comments_locked, like_count, comment_count, report_count";

export interface Viewer {
  userId: string;
  isStaff: boolean;
  canAccess: boolean;
}

export async function communityViewer(supabase: ServerSupabase, userId: string): Promise<Viewer> {
  const [accessRes, staffRes] = await Promise.all([supabase.rpc("can_access_community"), supabase.rpc("current_staff_role")]);
  return { userId, isStaff: Boolean(staffRes.data), canAccess: Boolean(accessRes.data) };
}

export async function loadSettings(supabase: ServerSupabase): Promise<CommunitySettings | null> {
  const { data } = await supabase.from("community_settings").select("name, description, cover_image_url, guidelines, open_to_students, require_approval").eq("id", 1).maybeSingle();
  return (data as CommunitySettings | null) ?? null;
}

export async function loadChannels(supabase: ServerSupabase): Promise<ChannelRow[]> {
  const { data, error } = await supabase.from("community_channels").select("*").order("position").order("name");
  if (error) console.error("[community] channels failed", error.message);
  return (data ?? []) as ChannelRow[];
}

export async function loadAuthors(supabase: ServerSupabase, ids: readonly string[]): Promise<Map<string, Author>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.rpc("community_profiles", { p_user_ids: unique });
  if (error) console.error("[community] profiles failed", error.message);
  const rows = (data ?? []) as { user_id: string; full_name: string | null; dog_name: string | null; avatar_url: string | null }[];
  const byId = new Map(rows.map((r) => [r.user_id, r]));
  return new Map(
    unique.map((id) => {
      const p = byId.get(id);
      return [id, { id, name: p?.full_name?.trim() || "Member", dogName: p?.dog_name ?? null, avatarUrl: p?.avatar_url ?? null }];
    })
  );
}

async function signedImageUrls(paths: readonly string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const { data, error } = await createServiceClient().storage.from(COMMUNITY_MEDIA_BUCKET).createSignedUrls([...paths], IMAGE_URL_TTL_SECONDS);
  if (error) console.error("[community] image urls failed", error.message);
  return new Map((data ?? []).flatMap((d) => (d.path && d.signedUrl ? [[d.path, d.signedUrl] as const] : [])));
}

/** Adds authors, images, poll results and the viewer's likes/votes to raw post rows. */
async function hydratePosts(supabase: ServerSupabase, rows: readonly PostRow[], channels: readonly ChannelRow[], viewerId: string): Promise<PostView[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const pollIds = rows.filter((r) => r.poll_options).map((r) => r.id);
  const [authors, images, likesRes, countsRes, votesRes] = await Promise.all([
    loadAuthors(supabase, rows.map((r) => r.author_id)),
    signedImageUrls(rows.flatMap((r) => (r.image_path ? [r.image_path] : []))),
    supabase.from("community_likes").select("post_id").in("post_id", ids),
    pollIds.length ? supabase.rpc("community_poll_counts", { p_post_ids: pollIds }) : Promise.resolve({ data: [] }),
    pollIds.length ? supabase.from("community_poll_votes").select("post_id, option_index").in("post_id", pollIds) : Promise.resolve({ data: [] }),
  ]);
  const liked = new Set(((likesRes.data ?? []) as { post_id: string }[]).map((l) => l.post_id));
  const counts = (countsRes.data ?? []) as { post_id: string; option_index: number; votes: number }[];
  const myVotes = new Map(((votesRes.data ?? []) as { post_id: string; option_index: number }[]).map((v) => [v.post_id, v.option_index]));
  const channelOf = new Map(channels.map((c) => [c.id, c]));

  return rows.map((r) => ({
    id: r.id,
    channel: r.channel_id && channelOf.get(r.channel_id) ? { id: r.channel_id, name: channelOf.get(r.channel_id)!.name, slug: channelOf.get(r.channel_id)!.slug } : null,
    challengeId: r.challenge_id,
    author: authors.get(r.author_id) ?? { id: r.author_id, name: "Member", dogName: null, avatarUrl: null },
    title: r.title,
    body: r.body,
    imageUrl: r.image_path ? (images.get(r.image_path) ?? null) : null,
    poll: r.poll_options
      ? { ...pollResults(r.poll_options, counts.filter((c) => c.post_id === r.id)), myVote: myVotes.get(r.id) ?? null }
      : null,
    status: r.status,
    publishAt: r.publish_at,
    pinned: r.pinned,
    commentsLocked: r.comments_locked,
    likeCount: r.like_count,
    commentCount: r.comment_count,
    reportCount: r.report_count,
    liked: liked.has(r.id),
    isMine: r.author_id === viewerId,
  }));
}

export type FeedSort = "new" | "active";

export interface FeedQuery {
  channelId?: string;
  challengeId?: string;
  authorId?: string;
  pinned?: boolean;
  sort?: FeedSort;
  search?: string;
  withImages?: boolean;
  limit?: number;
}

/** Live posts (published, or scheduled whose time has come). */
export async function loadFeed(supabase: ServerSupabase, channels: readonly ChannelRow[], viewerId: string, q: FeedQuery): Promise<PostView[]> {
  let query = supabase
    .from("community_posts")
    .select(POST_COLUMNS)
    .or(`status.eq.published,and(status.eq.scheduled,publish_at.lte.${new Date().toISOString()})`);
  if (q.channelId) query = query.eq("channel_id", q.channelId);
  if (q.challengeId) query = query.eq("challenge_id", q.challengeId);
  else if (!q.authorId) query = query.is("challenge_id", null);
  if (q.authorId) query = query.eq("author_id", q.authorId);
  if (q.pinned !== undefined) query = query.eq("pinned", q.pinned);
  if (q.withImages) query = query.not("image_path", "is", null);
  const term = q.search?.replace(/[%,()*\\]/g, " ").trim();
  if (term) query = query.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
  query =
    q.sort === "active"
      ? query.order("comment_count", { ascending: false }).order("like_count", { ascending: false }).order("publish_at", { ascending: false })
      : query.order("publish_at", { ascending: false });
  const { data, error } = await query.limit(q.limit ?? FEED_LIMIT);
  if (error) console.error("[community] feed failed", error.message);
  return hydratePosts(supabase, (data ?? []) as PostRow[], channels, viewerId);
}

/** Staff queues: posts waiting for approval, reported posts, or scheduled for later. */
export async function loadQueue(supabase: ServerSupabase, channels: readonly ChannelRow[], viewerId: string, kind: "review" | "scheduled"): Promise<PostView[]> {
  let query = supabase.from("community_posts").select(POST_COLUMNS);
  query =
    kind === "review"
      ? query.or("status.eq.pending,report_count.gt.0").neq("status", "removed").order("publish_at", { ascending: true })
      : query.eq("status", "scheduled").gt("publish_at", new Date().toISOString()).order("publish_at", { ascending: true });
  const { data, error } = await query.limit(100);
  if (error) console.error("[community] queue failed", error.message);
  return hydratePosts(supabase, (data ?? []) as PostRow[], channels, viewerId);
}

export async function loadPost(supabase: ServerSupabase, channels: readonly ChannelRow[], viewerId: string, postId: string) {
  const { data } = await supabase.from("community_posts").select(POST_COLUMNS).eq("id", postId).maybeSingle();
  if (!data) return null;
  const [post] = await hydratePosts(supabase, [data as PostRow], channels, viewerId);

  const { data: commentRows } = await supabase
    .from("community_comments")
    .select("id, parent_id, author_id, body, like_count, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
    .limit(500);
  const rows = (commentRows ?? []) as { id: string; parent_id: string | null; author_id: string; body: string; like_count: number; created_at: string }[];
  const [authors, likesRes] = await Promise.all([
    loadAuthors(supabase, rows.map((r) => r.author_id)),
    rows.length ? supabase.from("community_likes").select("comment_id").in("comment_id", rows.map((r) => r.id)) : Promise.resolve({ data: [] }),
  ]);
  const liked = new Set(((likesRes.data ?? []) as { comment_id: string }[]).map((l) => l.comment_id));
  const view = (r: (typeof rows)[number]): CommentView => ({
    id: r.id,
    parentId: r.parent_id,
    author: authors.get(r.author_id) ?? { id: r.author_id, name: "Member", dogName: null, avatarUrl: null },
    body: r.body,
    likeCount: r.like_count,
    liked: liked.has(r.id),
    isMine: r.author_id === viewerId,
    createdAt: r.created_at,
    replies: [],
  });
  // Replies whose parent was deleted (hidden by RLS) are shown as top-level comments instead of vanishing.
  const topIds = new Set(rows.filter((r) => !r.parent_id).map((r) => r.id));
  const isTop = (r: (typeof rows)[number]) => !r.parent_id || !topIds.has(r.parent_id);
  const comments = rows.filter(isTop).map((r) => ({
    ...view(r),
    replies: rows.filter((x) => x.parent_id === r.id).map(view),
  }));
  return { post, comments };
}

export interface MemberRow {
  user_id: string;
  full_name: string | null;
  dog_name: string | null;
  avatar_url: string | null;
  points: number;
  joined_at: string;
  total_count: number;
}

export async function loadMembers(supabase: ServerSupabase, search: string, limit: number, offset = 0): Promise<{ members: MemberRow[]; total: number }> {
  const { data, error } = await supabase.rpc("community_members", { p_search: search, p_limit: limit, p_offset: offset });
  if (error) console.error("[community] members failed", error.message);
  const members = (data ?? []) as MemberRow[];
  return { members, total: Number(members[0]?.total_count ?? 0) };
}

export async function loadLeaderboard(supabase: ServerSupabase, since: Date | null, limit = 25) {
  const { data, error } = await supabase.rpc("community_leaderboard", { p_since: since?.toISOString() ?? null, p_limit: limit });
  if (error) console.error("[community] leaderboard failed", error.message);
  return ((data ?? []) as { user_id: string; full_name: string | null; dog_name: string | null; avatar_url: string | null; points: number }[]).map((r) => ({
    ...r,
    points: Number(r.points),
  }));
}
