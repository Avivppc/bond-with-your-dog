"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

interface VideoLightboxProps {
  /** YouTube video id, e.g. "hNUWEknZ2xs". */
  youtubeId: string;
  title: string;
  /** The trigger. Rendered inside a <button>. */
  children: ReactNode;
  className?: string;
}

/**
 * Opens a YouTube video in an overlay instead of leaving the site.
 * Uses the privacy-enhanced embed domain and only mounts the iframe while open.
 */
export default function VideoLightbox({ youtubeId, title, children, className }: VideoLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, close]);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={className}>
        {children}
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 md:p-10"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close video"
            className="absolute top-4 right-4 md:top-6 md:right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <div
            className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden shadow-2xl bg-black"
            onClick={(event) => event.stopPropagation()}
          >
            <iframe
              className="w-full h-full"
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0`}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
}
