"use client";

import { useState, useTransition } from "react";
import { removeLessonVideo, setLessonVideo, type LessonVideoSummary } from "./content-actions";
import { BTN_PRIMARY, BTN_SECONDARY, Card, INPUT } from "@/app/admin/_components/ui";

interface VideoPanelProps {
  courseId: string;
  lessonId: string;
  video: LessonVideoSummary | null;
}

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Paste a Vimeo link → the lesson plays that video (only for students with access). */
export function VideoPanel({ courseId, lessonId, video }: VideoPanelProps) {
  const [current, setCurrent] = useState(video);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await setLessonVideo({ courseId, lessonId, url });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCurrent(res.data);
      setUrl("");
      setError(null);
    });
  }

  function remove() {
    if (!window.confirm("Remove the video from this lesson?")) return;
    startTransition(async () => {
      const res = await removeLessonVideo({ courseId, lessonId });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCurrent(null);
    });
  }

  return (
    <Card title="Media" description="Paste the video's Vimeo link. Thumbnail and length are filled in automatically.">
      <div className="space-y-4">
        {current ? (
          <div className="flex flex-wrap items-center gap-4 rounded-[8px] border border-[#efeeed] p-3">
            {current.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote Vimeo thumbnail, admin-only preview
              <img src={current.thumbnailUrl} alt="" className="aspect-video w-44 rounded-[6px] bg-[#f3f3f2] object-cover" />
            ) : (
              <div className="flex aspect-video w-44 items-center justify-center rounded-[6px] bg-[#f3f3f2] text-xs text-[#6c6a69]">
                {current.provider === "mux" ? "Mux video" : "Vimeo video"}
              </div>
            )}
            <div className="min-w-0 flex-1 space-y-1 text-sm">
              <p className="font-medium">
                {current.provider === "vimeo" ? "Vimeo" : "Mux (legacy)"}
                {formatDuration(current.durationSeconds) && (
                  <span className="ms-2 font-normal text-[#6c6a69]">{formatDuration(current.durationSeconds)}</span>
                )}
              </p>
              {current.sourceUrl && <p className="truncate text-[#6c6a69]">{current.sourceUrl}</p>}
              {!current.thumbnailUrl && current.provider === "vimeo" && (
                <p className="text-xs text-amber-700">
                  Couldn&apos;t load a preview from Vimeo — check the video&apos;s privacy settings. It may still play on the site.
                </p>
              )}
            </div>
            <button type="button" onClick={remove} disabled={pending} className="text-sm text-red-700 hover:underline">
              Remove
            </button>
          </div>
        ) : (
          <div className="flex aspect-[16/5] items-center justify-center rounded-[8px] border border-dashed border-[#d9d8d6] bg-[#fafaf9] text-sm text-[#6c6a69]">
            No video yet
          </div>
        )}

        <form onSubmit={save} className="flex flex-wrap items-center gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://vimeo.com/123456789/abcdef"
            aria-label="Vimeo link"
            className={`${INPUT} min-w-64 flex-1`}
            disabled={pending}
          />
          <button type="submit" disabled={pending || !url.trim()} className={current ? BTN_SECONDARY : BTN_PRIMARY}>
            {pending ? "Saving…" : current ? "Replace video" : "Add video"}
          </button>
        </form>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </Card>
  );
}
