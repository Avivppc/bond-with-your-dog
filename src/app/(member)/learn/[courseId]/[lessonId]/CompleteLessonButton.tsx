"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isWatchRequired } from "@/lib/member/watch";

interface CompleteLessonButtonProps {
  lessonId: string;
  completed: boolean;
  /** Whole minutes of video still to watch before the lesson can be completed (0 = ready). */
  minutesToWatch: number;
  /** The "Lesson complete" screen for this lesson. */
  doneHref: string;
}

const WATCH_FIRST = "Watch the video to complete this lesson.";

/**
 * Marks the lesson done (access and watching are checked in complete_lesson) and opens the
 * lesson-complete screen. Until most of the video was played it says how much is left; the player
 * refreshes the page once enough was watched.
 */
export function CompleteLessonButton({ lessonId, completed, minutesToWatch, doneHref }: CompleteLessonButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (completed) {
    return (
      <span className="pill reliable" style={{ height: 38, padding: "0 16px", display: "inline-flex", alignItems: "center", gap: 6 }}>
        <span className="ms sm fill" aria-hidden>
          check_circle
        </span>
        Completed
      </span>
    );
  }

  if (minutesToWatch > 0) {
    return (
      <span className="row" style={{ gap: 8 }}>
        <span className="faint" id={`watch-${lessonId}`}>
          {minutesToWatch === 1 ? "About 1 minute left to watch" : `About ${minutesToWatch} minutes left to watch`}
        </span>
        <button type="button" disabled className="btn btn-primary btn-sm" data-tour="complete" title={WATCH_FIRST} aria-describedby={`watch-${lessonId}`}>
          Complete lesson
        </button>
      </span>
    );
  }

  function complete() {
    startTransition(async () => {
      const { error: rpcError } = await createClient().rpc("complete_lesson", { p_lesson_id: lessonId });
      if (rpcError) {
        if (isWatchRequired(rpcError)) {
          setError(WATCH_FIRST);
          return;
        }
        console.error("complete_lesson failed", rpcError.message);
        setError("Couldn't save — try again.");
        return;
      }
      setError(null);
      router.push(doneHref);
    });
  }

  return (
    <span className="row" style={{ gap: 8 }}>
      {error && (
        <span role="alert" className="faint" style={{ color: "var(--danger)" }}>
          {error}
        </span>
      )}
      <button type="button" onClick={complete} disabled={pending} className="btn btn-primary btn-sm" data-tour="complete">
        {pending ? "Saving…" : "Complete lesson"}
      </button>
    </span>
  );
}
