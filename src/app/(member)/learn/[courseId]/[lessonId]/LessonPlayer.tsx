"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MuxPlayer from "@mux/mux-player-react";
import VimeoPlayer from "@vimeo/player";
import { createClient } from "@/lib/supabase/client";
import type { PlaybackResponse } from "@/app/api/lessons/[lessonId]/playback/route";
import { resumeFrom } from "@/lib/member/resume";
import { isWatchRequired, playbackErrorMessage, playedEnough, playedStep, watchedEnough } from "@/lib/member/watch";
import { EndCard, PlayerPoster, ResumeNotice } from "./PlayerOverlays";

const PROGRESS_EVERY_SECONDS = 15;
const RETRY_AFTER_PLAYED_SECONDS = 15;
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
  /** Seconds of this video already played on earlier visits (counts toward completing it). */
  playedSeconds: number;
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
 * completion. Two numbers are saved: the furthest point (for resuming) and the seconds actually
 * played (seeking doesn't count), which must reach 80% before the lesson can complete. Reaching
 * 90% of the timeline with enough played finishes the lesson. Progress is saved every 15 seconds
 * of playback (also after jumping back, e.g. "Start over"), and when the member pauses, leaves the
 * page or moves to another one.
 */
function useProgressRecorder(lessonId: string, alreadyCompleted: boolean, playedBefore: number, onCompleted: () => void, onEnough: () => void) {
  const completedRef = useRef(alreadyCompleted);
  const lastSaved = useRef(0);
  const lastSeen = useRef(0);
  // Seconds played: saved so far (from earlier visits too) and not yet saved.
  const playedSaved = useRef(playedBefore);
  const playedPending = useRef(0);
  const durationRef = useRef(0);
  const enoughShown = useRef(false);
  const callbacks = useRef({ onCompleted, onEnough });
  const lessonRef = useRef(lessonId);
  useEffect(() => {
    callbacks.current = { onCompleted, onEnough };
    lessonRef.current = lessonId;
  });

  const played = () => playedSaved.current + playedPending.current;
  /** Something not saved yet: played seconds, or a point further than the saved one. */
  const unsaved = () => playedPending.current >= 1 || lastSeen.current > lastSaved.current;

  const saveRef = useRef(async (seconds: number) => {
    lastSaved.current = seconds;
    const delta = Math.floor(playedPending.current);
    playedPending.current -= delta;
    const { error } = await createClient().rpc("record_lesson_progress", {
      p_lesson_id: lessonRef.current,
      p_watch_seconds: Math.floor(seconds),
      p_played_seconds: delta,
    });
    if (error) {
      console.error("record_lesson_progress failed", error.message);
      playedPending.current += delta; // sent with the next save
      return;
    }
    playedSaved.current += delta;
    // Enough watched but not at the end yet: refresh once so "Complete lesson" opens up.
    if (!completedRef.current && !enoughShown.current && playedEnough(playedSaved.current, durationRef.current)) {
      enoughShown.current = true;
      callbacks.current.onEnough();
    }
  });

  // When the database still says "watch first" (a save went missing), wait for more playback.
  const retryAtPlayed = useRef(0);

  async function complete(seconds: number) {
    if (completedRef.current || played() < retryAtPlayed.current || !playedEnough(played(), durationRef.current)) return;
    completedRef.current = true;
    await saveRef.current(seconds);
    const { error } = await createClient().rpc("complete_lesson", { p_lesson_id: lessonRef.current });
    if (error) {
      if (isWatchRequired(error)) retryAtPlayed.current = played() + RETRY_AFTER_PLAYED_SECONDS;
      else console.error("complete_lesson failed", error.message);
      completedRef.current = false; // try again on a later time update or "ended"
      return;
    }
    callbacks.current.onCompleted();
  }

  useEffect(() => {
    const flush = () => {
      if (unsaved()) void saveRef.current(lastSeen.current);
    };
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      document.removeEventListener("visibilitychange", flushWhenHidden);
      flush(); // moving to another page in the app
    };
  }, []);

  return {
    onTime(seconds: number, durationSeconds: number) {
      playedPending.current += playedStep(lastSeen.current, seconds);
      lastSeen.current = seconds;
      if (durationSeconds > 0) durationRef.current = durationSeconds;
      if (watchedEnough(seconds, durationSeconds)) void complete(seconds);
      if (playedPending.current >= PROGRESS_EVERY_SECONDS || seconds - lastSaved.current >= PROGRESS_EVERY_SECONDS) void saveRef.current(seconds);
    },
    onPause(seconds: number) {
      lastSeen.current = seconds;
      if (unsaved()) void saveRef.current(seconds);
    },
    onEnded(seconds: number) {
      lastSeen.current = seconds;
      if (completedRef.current || !playedEnough(played(), durationRef.current)) {
        if (unsaved()) void saveRef.current(seconds);
        return;
      }
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

export default function LessonPlayer({ lessonId, hasPlayback, resumeAt, poster, completed, playedSeconds, next, doneHref, practiceHref }: LessonPlayerProps) {
  const router = useRouter();
  const [data, setData] = useState<PlaybackResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [ended, setEnded] = useState(false);
  const [resumedAt, setResumedAt] = useState<number | null>(null);
  const [completedHere, setCompletedHere] = useState(false);
  const controls = useRef<PlayerControls | null>(null);
  // A lesson finished (or watched enough) updates the lesson list and the "Complete lesson" button.
  const progress = useProgressRecorder(
    lessonId,
    completed,
    playedSeconds,
    () => {
      setCompletedHere(true);
      router.refresh();
    },
    () => router.refresh(),
  );

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
          completed={completed || completedHere}
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
