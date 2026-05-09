"use client";

import { useEffect, useState } from "react";

type Question = {
  id: string;
  position: number;
  prompt: string;
  kind: "single" | "multi" | "tf";
  options: { id: string; text: string }[];
  explanation?: string | null;
};

type Result = {
  score: number;
  passed: boolean;
  perQuestion: { id: string; correct: boolean; explanation?: string | null }[];
};

export default function QuizPlayer({
  lessonId,
  passThreshold,
}: {
  lessonId: string;
  passThreshold: number;
}) {
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[] | boolean[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/quiz/${lessonId}/questions`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setQuestions(json.questions);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load questions");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  function setAnswer(qid: string, value: string[] | boolean[]) {
    setAnswers((a) => ({ ...a, [qid]: value }));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/quiz/${lessonId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  function retake() {
    setAnswers({});
    setResult(null);
  }

  if (error) {
    return <div className="p-8 text-red-700 text-sm">{error}</div>;
  }
  if (!questions) {
    return <div className="p-8 text-sm" style={{ color: "#515d64" }}>Loading…</div>;
  }
  if (questions.length === 0) {
    return (
      <div className="p-8 text-sm" style={{ color: "#515d64" }}>
        No questions yet — please check back soon.
      </div>
    );
  }

  return (
    <div className="p-8 md:p-10 space-y-8">
      {result ? (
        <ResultPanel
          result={result}
          questions={questions}
          passThreshold={passThreshold}
          onRetake={retake}
        />
      ) : (
        <>
          <header>
            <p
              className="text-xs font-bold uppercase tracking-widest mb-1"
              style={{ color: "#8b4b00" }}
            >
              Quiz · pass at {passThreshold}%
            </p>
            <h2
              className="text-2xl font-extrabold"
              style={{ fontFamily: "var(--font-headline)", color: "#243036" }}
            >
              Test what you&apos;ve learned
            </h2>
          </header>

          <ol className="space-y-6">
            {questions.map((q) => (
              <li
                key={q.id}
                className="border rounded-xl p-5"
                style={{ borderColor: "#dbebf4" }}
              >
                <p className="font-bold mb-4" style={{ color: "#243036" }}>
                  {q.position}. {q.prompt}
                </p>
                <Choices
                  question={q}
                  value={answers[q.id]}
                  onChange={(v) => setAnswer(q.id, v)}
                />
              </li>
            ))}
          </ol>

          <button
            onClick={submit}
            disabled={submitting}
            className="kinetic-gradient px-6 py-3 rounded-full font-bold text-sm shadow-md disabled:opacity-60"
            style={{ color: "#fff0e6" }}
          >
            {submitting ? "Grading..." : "Submit answers"}
          </button>
        </>
      )}
    </div>
  );
}

function Choices({
  question,
  value,
  onChange,
}: {
  question: Question;
  value: string[] | boolean[] | undefined;
  onChange: (v: string[] | boolean[]) => void;
}) {
  if (question.kind === "tf") {
    const v = (value as boolean[] | undefined)?.[0];
    return (
      <div className="grid grid-cols-2 gap-3">
        {[true, false].map((opt) => (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange([opt])}
            className={`px-4 py-3 rounded-lg border-2 font-bold text-sm transition-all ${
              v === opt
                ? "border-[#8b4b00] bg-orange-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            {opt ? "True" : "False"}
          </button>
        ))}
      </div>
    );
  }

  const selected = (value as string[] | undefined) ?? [];
  return (
    <div className="space-y-2">
      {question.options.map((opt) => {
        const isSelected = selected.includes(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => {
              if (question.kind === "single") {
                onChange([opt.id]);
              } else {
                onChange(
                  isSelected
                    ? selected.filter((s) => s !== opt.id)
                    : [...selected, opt.id]
                );
              }
            }}
            className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all flex items-center gap-3 ${
              isSelected
                ? "border-[#8b4b00] bg-orange-50"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                isSelected ? "border-[#8b4b00]" : "border-slate-300"
              }`}
            >
              {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-[#8b4b00]" />}
            </span>
            <span className="text-sm">{opt.text}</span>
          </button>
        );
      })}
    </div>
  );
}

function ResultPanel({
  result,
  questions,
  passThreshold,
  onRetake,
}: {
  result: Result;
  questions: Question[];
  passThreshold: number;
  onRetake: () => void;
}) {
  return (
    <div className="space-y-6">
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          backgroundColor: result.passed ? "#dcfce7" : "#fef3c7",
          color: result.passed ? "#166534" : "#92400e",
        }}
      >
        <div className="text-5xl font-black mb-2">{result.score}%</div>
        <p className="font-bold text-lg">
          {result.passed ? "You passed!" : `Below pass threshold of ${passThreshold}%`}
        </p>
        <p className="text-sm mt-1 opacity-80">
          {result.perQuestion.filter((p) => p.correct).length} of {questions.length} correct
        </p>
      </div>

      <ol className="space-y-3">
        {questions.map((q) => {
          const r = result.perQuestion.find((p) => p.id === q.id);
          return (
            <li
              key={q.id}
              className="border rounded-xl p-4 flex gap-4"
              style={{ borderColor: r?.correct ? "#bbf7d0" : "#fecaca" }}
            >
              <span
                className="material-symbols-outlined shrink-0"
                style={{
                  color: r?.correct ? "#16a34a" : "#dc2626",
                  fontVariationSettings: "'FILL' 1",
                }}
              >
                {r?.correct ? "check_circle" : "cancel"}
              </span>
              <div className="min-w-0">
                <p className="font-bold text-sm" style={{ color: "#243036" }}>
                  {q.position}. {q.prompt}
                </p>
                {r?.explanation && (
                  <p className="text-xs mt-1" style={{ color: "#515d64" }}>
                    {r.explanation}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="flex gap-3">
        {!result.passed && (
          <button
            onClick={onRetake}
            className="kinetic-gradient px-6 py-3 rounded-full font-bold text-sm"
            style={{ color: "#fff0e6" }}
          >
            Retake quiz
          </button>
        )}
        <button
          onClick={onRetake}
          className="px-6 py-3 rounded-full font-bold text-sm border-2"
          style={{ borderColor: "#8b4b00", color: "#8b4b00" }}
        >
          Review answers
        </button>
      </div>
    </div>
  );
}
