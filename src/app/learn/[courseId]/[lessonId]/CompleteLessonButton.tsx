"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface CompleteLessonButtonProps {
  lessonId: string;
  completed: boolean;
  /** Where to go after completing (the next lesson), if anywhere. */
  nextHref: string | null;
}

/** Kajabi's "Complete lesson": marks the lesson done (access is checked in complete_lesson) and moves on. */
export function CompleteLessonButton({ lessonId, completed, nextHref }: CompleteLessonButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (completed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e3f5f5] px-4 py-2 text-sm font-bold text-[#0e666a]">
        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }} aria-hidden>
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
      if (nextHref) router.push(nextHref);
      else router.refresh();
    });
  }

  return (
    <span className="inline-flex items-center gap-2">
      {error && (
        <span role="alert" className="text-xs font-semibold text-red-700">
          {error}
        </span>
      )}
      <button
        type="button"
        onClick={complete}
        disabled={pending}
        className="rounded-full bg-[#ff8f00] px-5 py-2 text-sm font-bold text-white shadow-sm hover:brightness-95 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Complete lesson"}
      </button>
    </span>
  );
}
