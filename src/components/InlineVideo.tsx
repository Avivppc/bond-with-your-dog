"use client";

import { useEffect, useState } from "react";

interface InlineVideoProps {
  /** YouTube video id, e.g. "hNUWEknZ2xs". */
  youtubeId: string;
  title: string;
  /** Poster shown until the visitor presses play. */
  posterSrc: string;
  posterAlt: string;
  /** Optional window event name; dispatching it starts playback (used by a button elsewhere on the page). */
  playEventName?: string;
  /** Classes for the frame while the poster is showing (size, aspect, radius, shadow). */
  posterFrameClassName?: string;
  /** Classes for the frame while playing. Defaults to a 16:9 frame so the video is never letterboxed. */
  playingFrameClassName?: string;
  id?: string;
}

/**
 * A poster image that turns into an embedded YouTube player in place when
 * clicked. Nothing from YouTube loads until the visitor presses play.
 */
export default function InlineVideo({
  youtubeId,
  title,
  posterSrc,
  posterAlt,
  playEventName,
  posterFrameClassName = "aspect-video rounded-2xl",
  playingFrameClassName = "aspect-video rounded-2xl",
  id,
}: InlineVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!playEventName) return;
    const start = () => setIsPlaying(true);
    window.addEventListener(playEventName, start);
    return () => window.removeEventListener(playEventName, start);
  }, [playEventName]);

  if (isPlaying) {
    return (
      <div id={id} className={`relative overflow-hidden bg-black ${playingFrameClassName}`}>
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      id={id}
      type="button"
      onClick={() => setIsPlaying(true)}
      aria-label={`Play: ${title}`}
      className={`relative overflow-hidden block w-full group text-left ${posterFrameClassName}`}
    >
      <img src={posterSrc} alt={posterAlt} className="absolute inset-0 w-full h-full object-cover" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="w-20 h-20 rounded-full bg-white/90 text-primary shadow-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
          <span
            className="material-symbols-outlined text-5xl"
            style={{ fontVariationSettings: '"FILL" 1' }}
          >
            play_arrow
          </span>
        </span>
      </span>
    </button>
  );
}

/** Dispatches the play event for an InlineVideo elsewhere on the page. */
export function playInlineVideo(eventName: string): void {
  window.dispatchEvent(new Event(eventName));
}
