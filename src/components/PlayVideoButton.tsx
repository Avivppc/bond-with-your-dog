"use client";

import type { ReactNode } from "react";
import { playInlineVideo } from "@/components/InlineVideo";

interface PlayVideoButtonProps {
  /** Must match the InlineVideo's playEventName. */
  eventName: string;
  /** Element id of the video; the page scrolls there before playing. */
  scrollToId?: string;
  className?: string;
  children: ReactNode;
}

export default function PlayVideoButton({ eventName, scrollToId, className, children }: PlayVideoButtonProps) {
  function handleClick() {
    if (scrollToId) {
      document.getElementById(scrollToId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    playInlineVideo(eventName);
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
