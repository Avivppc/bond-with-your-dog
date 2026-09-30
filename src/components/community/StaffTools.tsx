"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { moderatePost, schedulePost } from "@/app/community/actions";
import { BTN, BTN_GHOST, CARD, FIELD } from "./bits";

type ModerationAction = "approve" | "remove" | "dismiss_reports" | "publish_now";

/** Approve / remove / dismiss buttons for the review feed and scheduled posts. */
export function ModerationButtons({ postId, actions }: { postId: string; actions: readonly ModerationAction[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const LABEL: Record<ModerationAction, string> = { approve: "Approve", remove: "Remove", dismiss_reports: "Dismiss reports", publish_now: "Publish now" };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {actions.map((a) => (
        <button
          key={a}
          type="button"
          disabled={pending}
          className={a === "approve" || a === "publish_now" ? BTN : BTN_GHOST}
          onClick={() => {
            if (a === "remove" && !window.confirm("Remove this post?")) return;
            start(async () => {
              const res = await moderatePost({ postId, action: a });
              if (!res.ok) setError(res.error);
              else router.refresh();
            });
          }}
        >
          {LABEL[a]}
        </button>
      ))}
      {error && <span className="text-xs text-red-700">{error}</span>}
    </div>
  );
}

/** Staff composer for posts that go live later. */
export function ScheduleForm({ channels }: { channels: readonly { id: string; name: string }[] }) {
  const router = useRouter();
  const [channelId, setChannelId] = useState(channels[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [when, setWhen] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className={`${CARD} space-y-3 p-5`}
      onSubmit={(e) => {
        e.preventDefault();
        const at = new Date(when);
        if (!when || Number.isNaN(at.getTime())) {
          setError("Pick a date and time.");
          return;
        }
        start(async () => {
          const res = await schedulePost({ channelId, title: title || undefined, body, publishAt: at.toISOString() });
          if (!res.ok) {
            setError(res.error);
            return;
          }
          setTitle("");
          setBody("");
          setWhen("");
          setError(null);
          router.refresh();
        });
      }}
    >
      <h2 className="font-semibold">Schedule a post</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block text-[#6c6a69]">Channel</span>
          <select value={channelId} onChange={(e) => setChannelId(e.target.value)} className={FIELD}>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-[#6c6a69]">Publish at (your time)</span>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required className={FIELD} />
        </label>
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" maxLength={200} className={FIELD} />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={20000} placeholder="Write the post…" className={FIELD} />
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <button type="submit" disabled={pending || !body.trim() || !channelId} className={BTN}>
        {pending ? "Scheduling…" : "Schedule"}
      </button>
    </form>
  );
}
