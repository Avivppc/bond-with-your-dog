"use client";

import { useRef, useState } from "react";
import { BTN_PRIMARY, INPUT } from "../_components/ui";
import { isFilledIn } from "@/lib/saved-replies/replies";
import { SavedReplies } from "../_components/SavedReplies";

/** The inbox answer box (posted with its form as "answer"), the saved-replies picker and the send button. */
export function InboxAnswerField({ initial, firstName, submitLabel }: { initial: string; firstName: string | null; submitLabel: string }) {
  const [answer, setAnswer] = useState(initial);
  const box = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="space-y-2">
      <label className="block">
        <span className="sr-only">Answer</span>
        <textarea
          ref={box}
          name="answer"
          required
          maxLength={5000}
          rows={3}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Write your answer…"
          className={INPUT}
        />
      </label>
      <SavedReplies textareaRef={box} value={answer} onChange={setAnswer} vars={{ first_name: firstName }} />
      {/* Disabled while a {{tag}} is unfilled: the server would refuse it and the typed text would be lost. */}
      <button type="submit" disabled={!answer.trim() || !isFilledIn(answer)} className={BTN_PRIMARY}>
        {submitLabel}
      </button>
    </div>
  );
}
