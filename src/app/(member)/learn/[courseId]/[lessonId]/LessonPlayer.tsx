"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MuxPlayer from "@mux/mux-player-react";
import VimeoPlayer from "@vimeo/player";
import { createClient } from "@/lib/supabase/client";
import type { PlaybackResponse } from "@/app/api/lessons/[lessonId]/playback/route";
import { resumeFrom } from "@/lib/member/resume";
import { playbackErrorMessage, watchedEnough } from "@/lib/member/watch";
import { EndCard, PlayerPoster, ResumeNotice } from "./PlayerOverlays";

const PROGRESS_EVERY_SECONDS = 15;
/** How long "Picking up at …" stays on the video. */
const RESUME_NOTICE_MS = 8000;

interface LessonPlayerProps {
  lessonId: string;
  hasPlayback: boolean;
  /** Where the member stopped last time (see resumePoint); null starts from the top. */
  resumeAt: number | null;
  /** Lesson artwork, shown while the video loads or when there is none yet. */
  poster: string | null;
  completed: boolean;
  next: { href: string; title: string } | null;
  /** The "Lesson complete" screen. */
  doneHref: string;
  practiceHref: string;
}

/** What a provider's player reports back; both Vimeo and Mux feed the same handlers. */
interface PlayerEvents {
  onReady(): void;
  onResumed(seconds: number): void;
  onPlay(): void;
  onTime(seconds: number, durationSeconds: number): void;
  onPause(seconds: number): void;
  onEnded(seconds: number): void;
}

interface PlayerControls {
  seek(seconds: number): void;
  play(): void;
}

/**
 * Watch time and completion go through DB functions that check access; watch time never clears a
 * completion. Watching 90% counts as finishing, and the last position is saved when the member
 * pauses or leaves the page, not only every 15 seconds.
 */
function useProgressRecorder(lessonId: string, alreadyCompleted: boolean, onCompleted: () => void) {
  const completedRef = useRef(alreadyCompleted);
  const lastSaved = useRef(0);
  const lastSeen = useRef(0);
  const onCompletedRef = useRef(onCompleted);
  const lessonRef = useRef(lessonId);
  useEffect(() => {
    onCompletedRef.current = onCompleted;
    lessonRef.current = lessonId;
  });

  const saveRef = useRef(async (seconds: number) => {
    lastSaved.current = seconds;
    const { error } = await createClient().rpc("record_lesson_progress", { p_lesson_id: lessonRef.current, p_watch_seconds: Math.floor(seconds) });
    if (error) console.error("record_lesson_progress failed", error.message);
  });

  async function complete(seconds: number) {
    if (completedRef.current) return;
    completedRef.current = true;
    await saveRef.current(seconds);
    const { error } = await createClient().rpc("complete_lesson", { p_lesson_id: lessonRef.current });
    if (error) {
      console.error("complete_lesson failed", error.message);
      completedRef.current = false; // try again on the next time update or "ended"
      return;
    }
    onCompletedRef.current();
  }

  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden" && lastSeen.current > lastSaved.current) void saveRef.current(lastSeen.current);
    };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, []);

  return {
    onTime(seconds: number, durationSeconds: number) {
      lastSeen.current = seconds;
      if (watchedEnough(seconds, durationSeconds)) void complete(seconds);
      if (seconds - lastSaved.current >= PROGRESS_EVERY_SECONDS) void saveRef.current(seconds);
    },
    onPause(seconds: number) {
      lastSeen.current = seconds;
      if (seconds > lastSaved.current) void saveRef.current(seconds);
    },
    onEnded(seconds: number) {
      void complete(seconds);
    },
  };
}

function VimeoLessonVideo({ embedUrl, resumeAt, events, onControls }: { embedUrl: string; resumeAt: number | null; events: PlayerEvents; onControls: (c: PlayerControls) => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const eventsRef = useRef(events);
  useEffect(() => {
    eventsRef.current = events;
  });

  useEffect(() => {
    if (!frame.current) return;
    const player = new VimeoPlayer(frame.current);
    // Listeners stay attached for the iframe's life: removing and re-adding them (React mounts
    // effects twice in development) races inside the iframe and silently stops "timeupdate".
    // A stale mount just ignores what it hears.
    let alive = true;
    const when =
      <A extends unknown[]>(fn: (...args: A) => void) =>
      (...args: A) => {
        if (alive) fn(...args);
      };
    const fail = (what: string) => (err: unknown) => console.error(`[lesson] vimeo ${what} failed`, err instanceof Error ? err.message : String(err));
    onControls({
      seek: (s) => void player.setCurrentTime(s).catch(fail("seek")),
      play: () => void player.play().catch(fail("play")),
    });
    player
      .ready()
      .then(async () => {
        if (!alive) return;
        eventsRef.current.onReady();
        if (resumeAt === null) return;
        const start = resumeFrom(resumeAt, await player.getDuration());
        if (start > 0 && alive) {
          // Not awaited: before first play Vimeo may answer the seek late, and the note shouldn't wait.
          player.setCurrentTime(start).catch(fail("seek"));
          eventsRef.current.onResumed(start);
        }
      })
      .catch(fail("resume"));
    player.on("play", when(() => eventsRef.current.onPlay()));
    player.on("timeupdate", when((d: { seconds: number; duration: number }) => eventsRef.current.onTime(d.seconds, d.duration)));
    player.on("pause", when((d: { seconds: number }) => eventsRef.current.onPause(d.seconds)));
    player.on("ended", when((d: { seconds: number }) => eventsRef.current.onEnded(d.seconds)));
    return () => {
      // Never player.destroy(): it removes the iframe element itself, which React still owns.
      alive = false;
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

function MuxLessonVideo({ playbackId, token, lessonId, resumeAt, events, onControls }: { playbackId: string; token: string | null; lessonId: string; resumeAt: number | null; events: PlayerEvents; onControls: (c: PlayerControls) => void }) {
  const resumed = useRef(false);
  const media = (e: { target: EventTarget | null }) => e.target as HTMLMediaElement;
  return (
    <MuxPlayer
      streamType="on-demand"
      playbackId={playbackId}
      tokens={token ? { playback: token } : undefined}
      metadata={{ video_id: lessonId }}
      accentColor="#b36200"
      onLoadedMetadata={(e) => {
        const video = media(e);
        onControls({ seek: (s) => (video.currentTime = s), play: () => void video.play().catch(() => undefined) });
        events.onReady();
        if (resumed.current) return;
        resumed.current = true;
        const start = resumeFrom(resumeAt, video.duration || 0);
        if (start > 0) {
          video.currentTime = start;
          events.onResumed(start);
        }
      }}
      onPlay={() => events.onPlay()}
      onTimeUpdate={(e) => events.onTime(media(e).currentTime, media(e).duration)}
      onPause={(e) => events.onPause(media(e).currentTime)}
      onEnded={(e) => events.onEnded(media(e).currentTime)}
      style={{ aspectRatio: "16/9", width: "100%" }}
    />
  );
}

export default function LessonPlayer({ lessonId, hasPlayback, resumeAt, poster, completed, next, doneHref, practiceHref }: LessonPlayerProps) {
  const router = useRouter();
  const [data, setData] = useState<PlaybackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [ended, setEnded] = useState(false);
  const [resumedAt, setResumedAt] = useState<number | null>(null);
  const controls = useRef<PlayerControls | null>(null);
  // A lesson finished by watching ticks off in the lesson list and the "Complete lesson" button.
  const progress = useProgressRecorder(lessonId, completed, () => router.refresh());

  useEffect(() => {
    if (!hasPlayback) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/lessons/${lessonId}/playback`);
        if (!res.ok) throw new Error(playbackErrorMessage(res.status));
        const json = (await res.json()) as PlaybackResponse;
        if (!cancelled) setData(json);
      } catch (e: unknown) {
        const message = e instanceof Error && !(e instanceof TypeError) && !(e instanceof SyntaxError) ? e.message : playbackErrorMessage(0);
        if (!cancelled) setError(message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, hasPlayback]);

  useEffect(() => {
    if (resumedAt === null) return;
    const timer = setTimeout(() => setResumedAt(null), RESUME_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [resumedAt]);

  if (!hasPlayback) return <PlayerPoster src={poster}>The video for this lesson is on its way. Read the lesson below in the meantime.</PlayerPoster>;
  if (error) return <PlayerPoster src={poster}>{error}</PlayerPoster>;
  if (!data) return <PlayerPoster src={poster} loading />;

  const events: PlayerEvents = {
    onReady: () => setReady(true),
    onResumed: (seconds) => setResumedAt(seconds),
    onPlay: () => setEnded(false),
    onTime: progress.onTime,
    onPause: progress.onPause,
    onEnded: (seconds) => {
      progress.onEnded(seconds);
      setResumedAt(null);
      setEnded(true);
    },
  };
  const setControls = (c: PlayerControls) => {
    controls.current = c;
  };

  return (
    <>
      {data.provider === "vimeo" ? (
        <VimeoLessonVideo embedUrl={data.embedUrl} resumeAt={resumeAt} events={events} onControls={setControls} />
      ) : (
        <MuxLessonVideo playbackId={data.playbackId} token={data.token} lessonId={lessonId} resumeAt={resumeAt} events={events} onControls={setControls} />
      )}
      {!ready && <PlayerPoster src={poster} loading />}
      {resumedAt !== null && (
        <ResumeNotice
          at={resumedAt}
          onDismiss={() => setResumedAt(null)}
          onStartOver={() => {
            controls.current?.seek(0);
            setResumedAt(null);
          }}
        />
      )}
      {ended && (
        <EndCard
          next={next}
          doneHref={doneHref}
          practiceHref={practiceHref}
          onReplay={() => {
            setEnded(false);
            controls.current?.seek(0);
            controls.current?.play();
          }}
        />
      )}
    </>
  );
}
