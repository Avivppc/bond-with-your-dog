"use client";

import { useActionState, useState, type FormEvent } from "react";
import { TIER_ORDER, type Tier } from "@/lib/quiz/data";
import { quizConfigProblem, type QuizConfig, type QuizConfigQuestion } from "@/lib/quiz/config";
import { fromDraft, toDraft, type QuizDraft, type ResultDraft } from "@/lib/quiz/draft";
import { BTN_PRIMARY, Notice } from "../../_components/ui";
import { saveLeadQuiz, type SaveLeadQuizState } from "./actions";
import { QuestionsEditor } from "./QuestionsEditor";
import { ResultEditor } from "./ResultEditor";

const INITIAL_STATE: SaveLeadQuizState = { error: null };

interface LeadQuizEditorProps {
  initial: QuizConfig;
}

/** Edits the whole quiz in the browser and saves it in one go (checked here, then on the server). */
export default function LeadQuizEditor({ initial }: LeadQuizEditorProps) {
  const [draft, setDraft] = useState<QuizDraft>(() => toDraft(initial));
  const [clientError, setClientError] = useState<string | null>(null);
  const [state, formAction, isPending] = useActionState(saveLeadQuiz, INITIAL_STATE);
  const config = fromDraft(draft);
  const error = clientError ?? state.error;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const problem = quizConfigProblem(config);
    setClientError(problem);
    if (problem) event.preventDefault();
  }

  const setQuestions = (questions: QuizConfigQuestion[]) => setDraft((d) => ({ ...d, questions }));
  const setResult = (tier: Tier, patch: Partial<ResultDraft>) =>
    setDraft((d) => ({ ...d, results: { ...d.results, [tier]: { ...d.results[tier], ...patch } } }));

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-6">
      <input type="hidden" name="config" value={JSON.stringify(config)} />
      <QuestionsEditor questions={draft.questions} onChange={setQuestions} />
      {TIER_ORDER.map((tier) => (
        <ResultEditor key={tier} tier={tier} result={draft.results[tier]} onChange={(patch) => setResult(tier, patch)} />
      ))}
      <div className="sticky bottom-0 -mx-1 flex flex-col gap-3 border-t border-[#e7e6e4] bg-[#f8f8f8] px-1 py-4 sm:flex-row sm:items-center">
        <button type="submit" className={BTN_PRIMARY} disabled={isPending}>
          {isPending ? "Saving…" : "Save quiz"}
        </button>
        {error && <Notice tone="error">{error}</Notice>}
      </div>
    </form>
  );
}
