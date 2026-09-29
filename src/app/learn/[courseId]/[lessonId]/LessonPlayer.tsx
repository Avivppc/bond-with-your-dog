"use client";

import { useEffect, useRef, useState } from "react";
import MuxPlayer from "@mux/mux-player-react";
import { createClient } from "@/lib/supabase/client";

type PlaybackResponse = { playbackId: string; token: string | null };

export default function LessonPlayer({
  lessonId,
  hasPlayback,
}: {
  lessonId: string;
  hasPlayback: boolean;
}) {
  const [data, setData] = useState<PlaybackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reportedComplete = useRef(false);

  useEffect(() => {
    if (!hasPlayback) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/lessons/${lessonId}/playback`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        const json = (await res.json()) as PlaybackResponse;
        if (!cancelled) setData(json);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load video");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, hasPlayback]);

  // Progress writes go through DB functions that check access; watch time can
  // never clear a completion (see supabase/migrations/*_phase0_access_foundations.sql).
  // Returns false when a requested completion was not saved, so the caller can retry.
  async function recordProgress(seconds: number, complete: boolean): Promise<boolean> {
    const supabase = createClient();
    const [watch, done] = await Promise.all([
      supabase.rpc("record_lesson_progress", {
        p_lesson_id: lessonId,
        p_watch_seconds: Math.floor(seconds),
      }),
      complete ? supabase.rpc("complete_lesson", { p_lesson_id: lessonId }) : null,
    ]);
    if (watch.error) console.error("record_lesson_progress failed", watch.error.message);
    if (done?.error) {
      console.error("complete_lesson failed", done.error.message);
      return false;
    }
    return true;
  }

  if (!hasPlayback) {
    return (
      <div className="aspect-video flex items-center justify-center text-white text-sm">
        Video coming soon.
      </div>
    );
  }

  if (error) {
    return (
      <div className="aspect-video flex items-center justify-center text-white text-sm px-6 text-center">
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="aspect-video flex items-center justify-center text-white text-sm">
        Loading…
      </div>
    );
  }

  return (
    <MuxPlayer
      streamType="on-demand"
      playbackId={data.playbackId}
      tokens={data.token ? { playback: data.token } : undefined}
      metadata={{ video_id: lessonId }}
      onTimeUpdate={(e) => {
        const t = (e.target as HTMLMediaElement).currentTime;
        if (t > 0 && Math.floor(t) % 15 === 0) {
          void recordProgress(t, false);
        }
      }}
      onEnded={(e) => {
        if (reportedComplete.current) return;
        reportedComplete.current = true;
        const t = (e.target as HTMLMediaElement).currentTime;
        void recordProgress(t, true).then((saved) => {
          if (!saved) reportedComplete.current = false; // allow a retry on the next "ended"
        });
      }}
      style={{ aspectRatio: "16/9", width: "100%" }}
    />
  );
}
