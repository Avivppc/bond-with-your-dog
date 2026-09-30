"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PostView } from "@/lib/community/queries";
import { deletePost, moderatePost, reportPost, toggleLike, updatePost, vote } from "@/app/community/actions";
import { ActionMenu, MENU_ITEM } from "@/components/ui/ActionMenu";
import { Avatar, BTN, BTN_GHOST, CARD, FIELD, RichText, TimeAgo } from "./bits";

interface PostCardProps {
  post: PostView;
  isStaff: boolean;
  /** Full post page: no "open" link, body not clamped. */
  expanded?: boolean;
}

function Poll({ post }: { post: PostView }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const poll = post.poll!;
  const voted = poll.myVote !== null;
  return (
    <div className="mt-3 space-y-2">
      {poll.options.map((o, i) => (
        <button
          key={o.label + i}
          type="button"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await vote(post.id, i);
              if (res.ok) router.refresh();
            })
          }
          className={`relative w-full overflow-hidden rounded-[10px] border px-3 py-2 text-left text-sm ${poll.myVote === i ? "border-[#0e666a]" : "border-[#e7e6e4]"} hover:border-[#0e666a]`}
        >
          {voted && <span className="absolute inset-y-0 left-0 bg-[#e3f5f5]" style={{ width: `${o.percent}%` }} aria-hidden />}
          <span className="relative flex justify-between gap-3">
            <span className="font-medium">
              {poll.myVote === i && "✓ "}
              {o.label}
            </span>
            {voted && <span className="text-[#6c6a69]">{o.percent}%</span>}
          </span>
        </button>
      ))}
      <p className="text-xs text-[#6c6a69]">
        {poll.total} vote{poll.total === 1 ? "" : "s"}
        {voted ? " · tap another option to change your vote" : ""}
      </p>
    </div>
  );
}

/** A post in the feed / on its own page: author, content, image, poll, like/comment bar, ⋯ menu. */
export function PostCard({ post, isStaff, expanded = false }: PostCardProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(post.title ?? "");
  const [body, setBody] = useState(post.body);
  const [liked, setLiked] = useState(post.liked);
  const [likes, setLikes] = useState(post.likeCount);
  const [error, setError] = useState<string | null>(null);
  const href = `/community/posts/${post.id}`;

  function act(fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) {
    start(async () => {
      const res = await fn();
      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        return;
      }
      setError(null);
      after?.();
      router.refresh();
    });
  }

  function like() {
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    start(async () => {
      const res = await toggleLike({ postId: post.id });
      if (!res.ok) {
        setLiked(!next);
        setLikes((n) => n + (next ? -1 : 1));
        setError(res.error);
      }
    });
  }

  return (
    <article className={`${CARD} p-5 ${pending ? "opacity-80" : ""}`}>
      <header className="flex items-start gap-3">
        <Avatar author={post.author} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            <Link href={`/community/members/${post.author.id}`} className="hover:underline">
              {post.author.name}
            </Link>
            {post.author.dogName && <span className="font-normal text-[#6c6a69]"> & {post.author.dogName}</span>}
          </p>
          <p className="text-xs text-[#6c6a69]">
            <TimeAgo iso={post.publishAt} />
            {post.channel && (
              <>
                {" · "}
                <Link href={`/community/c/${post.channel.slug}`} className="hover:underline">
                  {post.channel.name}
                </Link>
              </>
            )}
            {post.pinned && <span className="ms-2 rounded-full bg-[#fdf1dc] px-2 py-0.5 text-[11px] font-semibold text-[#8a5a00]">Pinned</span>}
            {post.status === "pending" && <span className="ms-2 rounded-full bg-[#eef0ff] px-2 py-0.5 text-[11px] font-semibold text-[#3b2fa8]">Waiting for approval</span>}
            {post.status === "scheduled" && new Date(post.publishAt) > new Date() && (
              <span className="ms-2 rounded-full bg-[#eef0ff] px-2 py-0.5 text-[11px] font-semibold text-[#3b2fa8]">Scheduled</span>
            )}
            {isStaff && post.reportCount > 0 && (
              <span className="ms-2 rounded-full bg-[#fde8e8] px-2 py-0.5 text-[11px] font-semibold text-[#a4262c]">Reported ×{post.reportCount}</span>
            )}
          </p>
        </div>
        <ActionMenu
          label="Post actions"
          trigger={
            <span className="material-symbols-outlined text-[20px]" aria-hidden>
              more_horiz
            </span>
          }
          triggerClassName="flex rounded-full p-1 text-[#6c6a69] hover:bg-[#f3f3f2]"
        >
          {(close) => (
            <>
              {!expanded && (
                <Link href={href} className={MENU_ITEM} onClick={close}>
                  Open post
                </Link>
              )}
              {post.isMine && (
                <button type="button" className={MENU_ITEM} onClick={() => (close(), setEditing(true))}>
                  Edit
                </button>
              )}
              {(post.isMine || isStaff) && (
                <button
                  type="button"
                  className={`${MENU_ITEM} text-red-700`}
                  onClick={() => {
                    close();
                    if (window.confirm("Delete this post?")) act(() => deletePost(post.id), () => expanded && router.push("/community"));
                  }}
                >
                  Delete
                </button>
              )}
              {isStaff && (
                <>
                  <button type="button" className={MENU_ITEM} onClick={() => (close(), act(() => moderatePost({ postId: post.id, action: post.pinned ? "unpin" : "pin" })))}>
                    {post.pinned ? "Unpin" : "Pin to top"}
                  </button>
                  <button
                    type="button"
                    className={MENU_ITEM}
                    onClick={() => (close(), act(() => moderatePost({ postId: post.id, action: post.commentsLocked ? "unlock" : "lock" })))}
                  >
                    {post.commentsLocked ? "Turn comments on" : "Turn comments off"}
                  </button>
                </>
              )}
              {!post.isMine && (
                <button
                  type="button"
                  className={MENU_ITEM}
                  onClick={() => {
                    close();
                    const reason = window.prompt("Why are you reporting this post? (optional)");
                    if (reason !== null) act(() => reportPost(post.id, reason));
                  }}
                >
                  Report
                </button>
              )}
            </>
          )}
        </ActionMenu>
      </header>

      {editing ? (
        <form
          className="mt-3 space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            act(() => updatePost({ postId: post.id, title, body }), () => setEditing(false));
          }}
        >
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" maxLength={200} className={FIELD} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={20000} className={FIELD} />
          <div className="flex gap-2">
            <button type="submit" className={BTN} disabled={pending || !body.trim()}>
              Save
            </button>
            <button type="button" className={BTN_GHOST} onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-3">
          {post.title &&
            (expanded ? (
              <h1 className="text-xl font-bold">{post.title}</h1>
            ) : (
              <Link href={href} className="text-lg font-bold hover:underline">
                {post.title}
              </Link>
            ))}
          <RichText text={post.body} className={`mt-1 text-[15px] leading-relaxed ${expanded ? "" : "line-clamp-6"}`} />
        </div>
      )}

      {post.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- signed URL from the private community bucket
        <img src={post.imageUrl} alt="" className="mt-3 max-h-[480px] w-full rounded-[12px] border border-[#e7e6e4] object-cover" />
      )}
      {post.poll && <Poll post={post} />}

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <footer className="mt-4 flex items-center gap-1 border-t border-[#f0efee] pt-3 text-sm text-[#6c6a69]">
        <button type="button" onClick={like} aria-pressed={liked} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-[#f3f3f2]">
          <span className="material-symbols-outlined text-[20px]" style={liked ? { fontVariationSettings: "'FILL' 1", color: "#e0607e" } : undefined} aria-hidden>
            favorite
          </span>
          {likes > 0 ? likes : "Like"}
        </button>
        <Link href={`${href}#comments`} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 hover:bg-[#f3f3f2]">
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            chat_bubble
          </span>
          {post.commentCount > 0 ? post.commentCount : "Comment"}
        </Link>
        {post.commentsLocked && <span className="ms-auto text-xs">Comments are off</span>}
      </footer>
    </article>
  );
}
