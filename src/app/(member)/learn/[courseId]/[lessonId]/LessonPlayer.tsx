"use client";

import { useEffect, useRef, useState } from "react";
import MuxPlayer from "@mux/mux-player-react";
import VimeoPlayer from "@vimeo/player";
import { createClient } from "@/lib/supabase/client";
import type { PlaybackResponse } from "@/app/api/lessons/[lessonId]/playback/route";
import { resumeFrom } from "@/lib/member/resume";

const PROGRESS_EVERY_SECONDS = 15;
const VIDEO_ERROR = "We couldn't load this video. Refresh the page to try again.";

interface LessonPlayerProps {
  lessonId: string;
  hasPlayback: boolean;
  /** Where the member stopped last time (see resumePoint); null starts from the top. */
  resumeAt: number | null;
}

/** Progress writes go through DB functions that check access; watch time never clears a completion. */
function useProgressRecorder(lessonId: string) {
  const reportedComplete = useRef(false);
  const lastReported = useRef(0);

  async function record(seconds: number, complete: boolean): Promise<boolean> {
    const supabase = createClient();
    const [watch, done] = await Promise.all([
      supabase.rpc("record_lesson_progress", { p_lesson_id: lessonId, p_watch_seconds: Math.floor(seconds) }),
      complete ? supabase.rpc("complete_lesson", { p_lesson_id: lessonId }) : null,
    ]);
    if (watch.error) console.error("record_lesson_progress failed", watch.error.message);
    if (done?.error) {
      console.error("complete_lesson failed", done.error.message);
      return false;
    }
    return true;
  }

  return {
    onTime(seconds: number) {
      if (seconds - lastReported.current < PROGRESS_EVERY_SECONDS) return;
      lastReported.current = seconds;
      void record(seconds, false);
    },
    onEnded(seconds: number) {
      if (reportedComplete.current) return;
      reportedComplete.current = true;
      void record(seconds, true).then((saved) => {
        if (!saved) reportedComplete.current = false; // allow a retry on the next "ended"
      });
    },
  };
}

function VimeoLessonVideo({ embedUrl, lessonId, resumeAt }: { embedUrl: string; lessonId: string; resumeAt: number | null }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const progress = useProgressRecorder(lessonId);
  const progressRef = useRef(progress);

  useEffect(() => {
    progressRef.current = progress;
  });

  useEffect(() => {
    if (!frame.current) return;
    const player = new VimeoPlayer(frame.current);
    if (resumeAt !== null) {
      player
        .ready()
        .then(() => player.getDuration())
        .then((duration) => {
          const start = resumeFrom(resumeAt, duration);
          return start > 0 ? player.setCurrentTime(start) : undefined;
        })
        .catch((err: unknown) => console.error("[lesson] resume failed", err instanceof Error ? err.message : String(err)));
    }
    player.on("timeupdate", (data: { seconds: number }) => progressRef.current.onTime(data.seconds));
    player.on("ended", (data: { seconds: number }) => progressRef.current.onEnded(data.seconds));
    return () => {
      // Only detach listeners: player.destroy() removes the iframe element itself,
      // which React still owns (breaks StrictMode remounts and lesson-to-lesson navigation).
      player.off("timeupdate");
      player.off("ended");
    };
    // Resume once per video, not when the saved point changes under it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedUrl]);

  return (
    <iframe
      ref={frame}
      src={embedUrl}
      title="Lesson video"
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
      allowFullScreen
      className="w-full aspect-video border-0"
    />
  );
}

function MuxLessonVideo({ playbackId, token, lessonId, resumeAt }: { playbackId: string; token: string | null; lessonId: string; resumeAt: number | null }) {
  const progress = useProgressRecorder(lessonId);
  const resumed = useRef(false);
  return (
    <MuxPlayer
      streamType="on-demand"
      playbackId={playbackId}
      tokens={token ? { playback: token } : undefined}
      metadata={{ video_id: lessonId }}
      onLoadedMetadata={(e) => {
        if (resumed.current) return;
        resumed.current = true;
        const video = e.target as HTMLMediaElement;
        const start = resumeFrom(resumeAt, video.duration || 0);
        if (start > 0) video.currentTime = start;
      }}
      onTimeUpdate={(e) => progress.onTime((e.target as HTMLMediaElement).currentTime)}
      onEnded={(e) => progress.onEnded((e.target as HTMLMediaElement).currentTime)}
      style={{ aspectRatio: "16/9", width: "100%" }}
    />
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return <div className="aspect-video flex items-center justify-center text-white text-sm px-6 text-center">{children}</div>;
}

export default function LessonPlayer({ lessonId, hasPlayback, resumeAt }: LessonPlayerProps) {
  const [data, setData] = useState<PlaybackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasPlayback) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/lessons/${lessonId}/playback`);
        const json = (await res.json().catch(() => ({}))) as PlaybackResponse | { error?: string };
        if (!res.ok) throw new Error(("error" in json && json.error) || VIDEO_ERROR);
        if (!cancelled) setData(json as PlaybackResponse);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error && !(e instanceof TypeError) && e.message ? e.message : VIDEO_ERROR);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, hasPlayback]);

  if (!hasPlayback) return <Message>Video coming soon.</Message>;
  if (error) return <Message>{error}</Message>;
  if (!data) return <Message>Loading…</Message>;

  return data.provider === "vimeo" ? (
    <VimeoLessonVideo embedUrl={data.embedUrl} lessonId={lessonId} resumeAt={resumeAt} />
  ) : (
    <MuxLessonVideo playbackId={data.playbackId} token={data.token} lessonId={lessonId} resumeAt={resumeAt} />
  );
}
