"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Plays the routine's music and reports the playhead (for highlighting the current move). */
export function usePreview(url: string | null) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    const el = new Audio(url);
    el.preload = "metadata";
    audio.current = el;
    let frame = 0;
    const tick = () => {
      setTime(el.currentTime);
      frame = window.requestAnimationFrame(tick);
    };
    const onPlay = () => {
      setPlaying(true);
      frame = window.requestAnimationFrame(tick);
    };
    const onStop = () => {
      setPlaying(false);
      window.cancelAnimationFrame(frame);
      setTime(el.currentTime);
    };
    const onError = () => setError("The music couldn't be played. Try reloading the page.");
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onStop);
    el.addEventListener("ended", onStop);
    el.addEventListener("error", onError);
    return () => {
      window.cancelAnimationFrame(frame);
      el.pause();
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onStop);
      el.removeEventListener("ended", onStop);
      el.removeEventListener("error", onError);
      audio.current = null;
      // The "pause" event from el.pause() arrives after the listeners are gone.
      setPlaying(false);
      setTime(0);
    };
  }, [url]);

  const toggle = useCallback(() => {
    const el = audio.current;
    if (!el) return;
    setError(null);
    if (el.paused) {
      if (el.ended) el.currentTime = 0;
      el.play().catch(() => setError("Press play again to start the music."));
    } else {
      el.pause();
    }
  }, []);

  const seek = useCallback((seconds: number) => {
    const el = audio.current;
    if (!el) return;
    el.currentTime = Math.max(0, seconds);
    setTime(el.currentTime);
  }, []);

  return { playing, time, error, toggle, seek };
}

/** Duration of an audio file, read in the browser. */
export function readAudioDuration(src: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const el = new Audio();
    el.preload = "metadata";
    el.onloadedmetadata = () => (Number.isFinite(el.duration) && el.duration > 0 ? resolve(el.duration) : reject(new Error("unknown duration")));
    el.onerror = () => reject(new Error("unreadable audio"));
    el.src = src;
  });
}
