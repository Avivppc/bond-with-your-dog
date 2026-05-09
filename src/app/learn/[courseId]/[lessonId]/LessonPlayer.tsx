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

  async function recordProgress(seconds: number, complete: boolean) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("lesson_progress").upsert(
      {
        user_id: user.id,
        lesson_id: lessonId,
        watch_seconds: Math.floor(seconds),
        completed_at: complete ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lesson_id" }
    );
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
        void recordProgress(t, true);
      }}
      style={{ aspectRatio: "16/9", width: "100%" }}
    />
  );
}
