"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { reportLessonCompleted } from "./analytics-actions";

interface CompleteLessonButtonProps {
  lessonId: string;
  completed: boolean;
  /** The "Lesson complete" screen for this lesson. */
  doneHref: string;
}

/** Marks the lesson done (access is checked in complete_lesson) and opens the lesson-complete screen. */
export function CompleteLessonButton({ lessonId, completed, doneHref }: CompleteLessonButtonProps) {
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

  function complete() {
    startTransition(async () => {
      const { error: rpcError } = await createClient().rpc("complete_lesson", { p_lesson_id: lessonId });
      if (rpcError) {
        console.error("complete_lesson failed", rpcError.message);
        setError("Couldn't save — try again.");
        return;
      }
      setError(null);
      void reportLessonCompleted(lessonId);
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
