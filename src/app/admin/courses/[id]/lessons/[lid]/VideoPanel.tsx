"use client";

import { useState, useTransition } from "react";
import { removeLessonVideo, setLessonVideo, type LessonVideoSummary } from "./content-actions";

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
    <section className="bg-white rounded-xl p-6 shadow-sm space-y-4">
      <h2 className="text-xl font-extrabold tracking-tighter">Video</h2>

      {current ? (
        <div className="flex items-center gap-4">
          {current.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote Vimeo thumbnail, admin-only preview
            <img src={current.thumbnailUrl} alt="" className="w-40 aspect-video object-cover rounded-lg bg-slate-100" />
          ) : (
            <div className="w-40 aspect-video rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-500">
              {current.provider === "mux" ? "Mux video" : "Vimeo video"}
            </div>
          )}
          <div className="text-sm space-y-1 min-w-0">
            <p className="font-bold text-slate-800">
              {current.provider === "vimeo" ? "Vimeo" : "Mux (legacy)"}
              {formatDuration(current.durationSeconds) && (
                <span className="ms-2 font-normal text-slate-500">{formatDuration(current.durationSeconds)}</span>
              )}
            </p>
            {current.sourceUrl && <p className="text-slate-500 truncate">{current.sourceUrl}</p>}
            {!current.thumbnailUrl && current.provider === "vimeo" && (
              <p className="text-xs text-amber-700">
                Couldn&apos;t load a preview from Vimeo — check the video&apos;s privacy settings. It may still play on the site.
              </p>
            )}
            <button type="button" onClick={remove} disabled={pending} className="text-xs text-red-600 hover:text-red-800">
              Remove video
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No video yet.</p>
      )}

      <form onSubmit={save} className="flex flex-wrap gap-2 items-center">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a Vimeo link, e.g. https://vimeo.com/123456789/abcdef"
          className="flex-1 min-w-64 px-4 py-2.5 rounded-lg border border-slate-200"
          disabled={pending}
        />
        <button
          type="submit"
          disabled={pending || !url.trim()}
          className="bg-orange-700 text-white px-5 py-2.5 rounded-full font-bold text-sm disabled:opacity-50"
        >
          {pending ? "Saving…" : current ? "Replace video" : "Add video"}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
