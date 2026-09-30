"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT } from "@/app/admin/_components/ui";
import { answerQuestion } from "./actions";

interface AnswerFormProps {
  questionId: string;
  initialAnswer: string;
  /** Editing an existing answer (vs. answering for the first time, which notifies the member). */
  editing: boolean;
  onDone?: () => void;
}

/** Inline answer box: keeps the text on errors and refreshes the list when saved. */
export function AnswerForm({ questionId, initialAnswer, editing, onDone }: AnswerFormProps) {
  const router = useRouter();
  const [answer, setAnswer] = useState(initialAnswer);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await answerQuestion({ id: questionId, answer });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onDone?.();
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={3}
        maxLength={4000}
        required
        placeholder="Write your answer…"
        aria-label="Answer"
        className={`${INPUT} resize-y`}
      />
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={pending || !answer.trim()} className={BTN_PRIMARY}>
          {pending ? "Saving…" : editing ? "Save answer" : "Send answer"}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className={BTN_SECONDARY}>
            Cancel
          </button>
        )}
        {!editing && <span className="text-xs text-[#6c6a69]">The member gets a notification.</span>}
      </div>
    </form>
  );
}

/** Shows an answer with an "Edit answer" toggle. */
export function EditableAnswer({ questionId, answer }: { questionId: string; answer: string }) {
  const [editing, setEditing] = useState(false);
  if (editing) return <AnswerForm questionId={questionId} initialAnswer={answer} editing onDone={() => setEditing(false)} />;
  return (
    <div className="flex flex-col items-start gap-1">
      <p className="whitespace-pre-wrap text-sm text-[#1a1a19]">{answer}</p>
      <button type="button" onClick={() => setEditing(true)} className="text-sm font-medium text-[#1a1a19] underline-offset-2 hover:underline">
        Edit answer
      </button>
    </div>
  );
}
