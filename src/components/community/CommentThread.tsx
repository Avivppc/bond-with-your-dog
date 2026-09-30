"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CommentView } from "@/lib/community/queries";
import { addComment, deleteComment, toggleLike } from "@/app/community/actions";
import { Avatar, BTN, FIELD, RichText, TimeAgo } from "./bits";

interface CommentThreadProps {
  postId: string;
  comments: readonly CommentView[];
  locked: boolean;
  isStaff: boolean;
  me: { id: string; name: string; avatarUrl: string | null };
}

function CommentForm({ postId, parentId, me, onDone, placeholder }: { postId: string; parentId: string | null; me: CommentThreadProps["me"]; onDone?: () => void; placeholder: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex items-start gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await addComment({ postId, parentId, body });
          if (!res.ok) {
            setError(res.error);
            return;
          }
          setBody("");
          setError(null);
          onDone?.();
          router.refresh();
        });
      }}
    >
      <Avatar author={me} size={30} />
      <div className="min-w-0 flex-1 space-y-1">
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} maxLength={5000} placeholder={placeholder} aria-label={placeholder} className={FIELD} />
        {error && (
          <p role="alert" className="text-xs text-red-700">
            {error}
          </p>
        )}
      </div>
      <button type="submit" disabled={pending || !body.trim()} className={BTN}>
        {pending ? "…" : "Send"}
      </button>
    </form>
  );
}

function Comment({ comment, postId, locked, isStaff, me, canReply }: { comment: CommentView; postId: string; locked: boolean; isStaff: boolean; me: CommentThreadProps["me"]; canReply: boolean }) {
  const router = useRouter();
  const [replying, setReplying] = useState(false);
  const [liked, setLiked] = useState(comment.liked);
  const [likes, setLikes] = useState(comment.likeCount);
  const [pending, start] = useTransition();

  return (
    <li className={pending ? "opacity-70" : ""}>
      <div className="flex gap-3">
        <Avatar author={comment.author} size={30} />
        <div className="min-w-0 flex-1">
          <div className="rounded-[12px] bg-[#f7f7f8] px-3 py-2">
            <p className="text-sm font-semibold">
              <Link href={`/community/members/${comment.author.id}`} className="hover:underline">
                {comment.author.name}
              </Link>
            </p>
            <RichText text={comment.body} className="text-sm" />
          </div>
          <div className="mt-1 flex items-center gap-3 px-1 text-xs text-[#6c6a69]">
            <TimeAgo iso={comment.createdAt} />
            <button
              type="button"
              aria-pressed={liked}
              className={`font-semibold ${liked ? "text-[#e0607e]" : "hover:text-[#1a1a19]"}`}
              onClick={() => {
                const next = !liked;
                setLiked(next);
                setLikes((n) => n + (next ? 1 : -1));
                start(async () => {
                  const res = await toggleLike({ commentId: comment.id });
                  if (!res.ok) {
                    setLiked(!next);
                    setLikes((n) => n + (next ? -1 : 1));
                  }
                });
              }}
            >
              {liked ? "Liked" : "Like"}
              {likes > 0 && ` · ${likes}`}
            </button>
            {canReply && !locked && (
              <button type="button" className="font-semibold hover:text-[#1a1a19]" onClick={() => setReplying((v) => !v)}>
                Reply
              </button>
            )}
            {(comment.isMine || isStaff) && (
              <button
                type="button"
                className="font-semibold hover:text-red-700"
                onClick={() => {
                  if (!window.confirm("Delete this comment?")) return;
                  start(async () => {
                    const res = await deleteComment(comment.id);
                    if (res.ok) router.refresh();
                  });
                }}
              >
                Delete
              </button>
            )}
          </div>
          {comment.replies.length > 0 && (
            <ul className="mt-3 space-y-3">
              {comment.replies.map((r) => (
                <Comment key={r.id} comment={r} postId={postId} locked={locked} isStaff={isStaff} me={me} canReply={false} />
              ))}
            </ul>
          )}
          {replying && (
            <div className="mt-3">
              <CommentForm postId={postId} parentId={comment.id} me={me} onDone={() => setReplying(false)} placeholder={`Reply to ${comment.author.name}…`} />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/** Comments with one level of replies, likes and the comment box. */
export function CommentThread({ postId, comments, locked, isStaff, me }: CommentThreadProps) {
  return (
    <section id="comments" className="space-y-4">
      {comments.length > 0 ? (
        <ul className="space-y-4">
          {comments.map((c) => (
            <Comment key={c.id} comment={c} postId={postId} locked={locked} isStaff={isStaff} me={me} canReply />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[#6c6a69]">No comments yet — be the first.</p>
      )}
      {locked && !isStaff ? (
        <p className="text-sm text-[#6c6a69]">Comments are turned off for this post.</p>
      ) : (
        <CommentForm postId={postId} parentId={null} me={me} placeholder="Write a comment…" />
      )}
    </section>
  );
}
