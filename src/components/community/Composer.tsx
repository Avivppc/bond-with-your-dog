"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { validateCommunityImage } from "@/lib/community/media";
import { createPost, startCommunityUpload } from "@/app/community/actions";
import { Avatar, BTN, BTN_GHOST, CARD, FIELD } from "./bits";

const MEDIA_BUCKET = "community-media";
const MAX_POLL_OPTIONS = 6;

interface ComposerChannel {
  id: string;
  name: string;
  default_view: "feed" | "forum" | "gallery";
}

interface ComposerProps {
  me: { id: string; name: string; avatarUrl: string | null };
  channels: readonly ComposerChannel[];
  defaultChannelId: string | null;
  challengeId?: string | null;
  placeholder?: string;
  /** Posts need approval before they're visible (shown as a hint). */
  moderated?: boolean;
}

/** "Write post…" box that expands into the full composer: channel, title, text, image or poll. */
export function Composer({ me, channels, defaultChannelId, challengeId = null, placeholder = "Write post…", moderated = false }: ComposerProps) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [channelId, setChannelId] = useState(defaultChannelId ?? channels[0]?.id ?? null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState<{ path: string; preview: string } | null>(null);
  const [poll, setPoll] = useState<string[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const channel = channels.find((c) => c.id === channelId);

  function reset() {
    setTitle("");
    setBody("");
    setImage(null);
    setPoll(null);
    setOpen(false);
  }

  async function pickImage(file: File | undefined) {
    if (!file) return;
    const invalid = validateCommunityImage({ name: file.name, size: file.size, type: file.type });
    if (invalid) {
      setError(invalid);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const started = await startCommunityUpload({ fileName: file.name, size: file.size, contentType: file.type });
      if (!started.ok) {
        setError(started.error);
        return;
      }
      const { error: uploadError } = await createClient()
        .storage.from(MEDIA_BUCKET)
        .uploadToSignedUrl(started.data.path, started.data.token, file, { contentType: file.type });
      if (uploadError) {
        setError("Upload failed — please try again.");
        return;
      }
      setImage({ path: started.data.path, preview: URL.createObjectURL(file) });
      setPoll(null);
    } catch (err) {
      console.error("community image upload failed", err);
      setError("Upload failed — check your connection and try again.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const options = poll?.map((o) => o.trim()).filter(Boolean) ?? null;
    if (poll && (!options || options.length < 2)) {
      setError("A poll needs at least two options.");
      return;
    }
    start(async () => {
      const res = await createPost({
        channelId: challengeId ? null : channelId,
        challengeId,
        title: title || undefined,
        body,
        imagePath: image?.path ?? null,
        pollOptions: options,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setError(null);
      setNotice(moderated ? "Thanks! Your post will appear once the team approves it." : null);
      reset();
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div className={`${CARD} flex items-center gap-3 p-4`}>
        <Avatar author={{ id: me.id, name: me.name, avatarUrl: me.avatarUrl }} />
        <button type="button" onClick={() => (setOpen(true), setNotice(null))} className="flex-1 rounded-full border border-[#e7e6e4] px-4 py-2.5 text-left text-sm text-[#6c6a69] hover:bg-[#fafaf9]">
          {placeholder}
        </button>
        {notice && <span className="text-xs text-[#0e666a]">{notice}</span>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`${CARD} space-y-3 p-4`}>
      <div className="flex items-center gap-3">
        <Avatar author={{ id: me.id, name: me.name, avatarUrl: me.avatarUrl }} />
        {!challengeId && channels.length > 0 && (
          <label className="text-sm">
            <span className="sr-only">Channel</span>
            <select value={channelId ?? ""} onChange={(e) => setChannelId(e.target.value)} className="rounded-full border border-[#e7e6e4] bg-white px-3 py-1.5 text-sm">
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={channel?.default_view === "forum" ? "Title — what's your question?" : "Title (optional)"}
        maxLength={200}
        className={FIELD}
      />
      <textarea autoFocus value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={20000} placeholder="Share something with the community…" className={FIELD} />

      {image && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element -- local preview of the member's upload */}
          <img src={image.preview} alt="" className="max-h-72 rounded-[12px] border border-[#e7e6e4] object-cover" />
          <button type="button" onClick={() => setImage(null)} className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
            Remove
          </button>
        </div>
      )}

      {poll && (
        <div className="space-y-2 rounded-[12px] bg-[#fafaf9] p-3">
          <p className="text-xs font-semibold text-[#6c6a69]">Poll options</p>
          {poll.map((option, i) => (
            <input
              key={i}
              value={option}
              onChange={(e) => setPoll(poll.map((o, j) => (j === i ? e.target.value : o)))}
              placeholder={`Option ${i + 1}`}
              maxLength={100}
              className={FIELD}
            />
          ))}
          <div className="flex gap-3 text-sm">
            {poll.length < MAX_POLL_OPTIONS && (
              <button type="button" onClick={() => setPoll([...poll, ""])} className="font-semibold text-[#0e666a]">
                + Add option
              </button>
            )}
            <button type="button" onClick={() => setPoll(null)} className="text-[#6c6a69]">
              Remove poll
            </button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          <label className={`inline-flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-sm text-[#6c6a69] hover:bg-[#f3f3f2] ${uploading ? "opacity-60" : ""}`}>
            <span className="material-symbols-outlined text-[20px]" aria-hidden>
              image
            </span>
            {uploading ? "Uploading…" : "Photo"}
            <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={uploading} onChange={(e) => void pickImage(e.target.files?.[0])} />
          </label>
          {!poll && (
            <button type="button" onClick={() => (setPoll(["", ""]), setImage(null))} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-[#6c6a69] hover:bg-[#f3f3f2]">
              <span className="material-symbols-outlined text-[20px]" aria-hidden>
                ballot
              </span>
              Poll
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={reset} className={BTN_GHOST}>
            Cancel
          </button>
          <button type="submit" disabled={pending || uploading || !body.trim()} className={BTN}>
            {pending ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
      {moderated && <p className="text-xs text-[#6c6a69]">Posts are reviewed by the team before they appear.</p>}
    </form>
  );
}
