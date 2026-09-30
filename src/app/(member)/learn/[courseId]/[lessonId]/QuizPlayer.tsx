"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Ms } from "@/components/app/ui";

type Question = {
  id: string;
  position: number;
  prompt: string;
  kind: "single" | "multi" | "tf";
  options: { id: string; text: string }[];
};

type Result = {
  score: number;
  passed: boolean;
  perQuestion: { id: string; correct: boolean; explanation?: string | null }[];
};

type Answer = string[] | boolean[];

const KEYS = "ABCDEFGH";

interface QuizPlayerProps {
  lessonId: string;
  passThreshold: number;
  lessonNumber: number;
  nextHref: string | null;
}

/** "Checkpoint" (design): one question at a time, graded on the server when all are answered. */
export default function QuizPlayer({ lessonId, passThreshold, lessonNumber, nextHref }: QuizPlayerProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [index, setIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/quiz/${lessonId}/questions`);
        if (!res.ok) throw new Error(res.status === 403 ? "You need access to this lesson." : "Could not load the questions.");
        const json = await res.json();
        if (!cancelled) setQuestions(json.questions);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load the questions.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/quiz/${lessonId}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not check your answers.");
      setResult(json);
      if (json.passed) router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not check your answers.");
    } finally {
      setSubmitting(false);
    }
  }

  const shell = (children: React.ReactNode) => (
    <div className="card" style={{ maxWidth: 760, margin: "0 auto", width: "100%", padding: 44, gap: 26 }}>
      {children}
    </div>
  );

  if (error && !questions) return shell(<p role="alert" className="muted">{error}</p>);
  if (!questions) return shell(<div className="skel" style={{ height: 180 }} />);
  if (questions.length === 0) return shell(<p className="muted">Roni is still writing this checkpoint. Check back soon.</p>);
  if (result) return shell(<Results result={result} questions={questions} passThreshold={passThreshold} nextHref={nextHref} onRetry={() => (setResult(null), setAnswers({}), setIndex(0))} />);

  const q = questions[index];
  const value = answers[q.id];
  const answered = Array.isArray(value) && value.length > 0;
  const last = index === questions.length - 1;
  const choose = (v: Answer) => setAnswers((a) => ({ ...a, [q.id]: v }));
  const selected = (value as string[] | undefined) ?? [];

  return shell(
    <>
      <div className="between">
        <span className="eyebrow">Checkpoint · Lesson {lessonNumber}</span>
        <span className="faint num">
          Question {index + 1} of {questions.length}
        </span>
      </div>
      <div className="steps-dots" aria-hidden>
        {questions.map((x, i) => (
          <i key={x.id} className={i < index ? "done" : i === index ? "on" : ""} />
        ))}
      </div>
      <h1 className="h2" style={{ fontSize: 28 }}>
        {q.prompt}
      </h1>
      <div className="options" role={q.kind === "multi" ? "group" : "radiogroup"} aria-label="Answers">
        {q.kind === "tf"
          ? [true, false].map((opt, i) => {
              const on = (value as boolean[] | undefined)?.[0] === opt;
              return (
                <button key={String(opt)} type="button" role="radio" aria-checked={on} className={`option ${on ? "sel" : ""}`} onClick={() => choose([opt])}>
                  <span className="key">{KEYS[i]}</span>
                  <span>{opt ? "True" : "False"}</span>
                </button>
              );
            })
          : q.options.map((opt, i) => {
              const on = selected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  role={q.kind === "multi" ? "checkbox" : "radio"}
                  aria-checked={on}
                  className={`option ${on ? "sel" : ""}`}
                  onClick={() => choose(q.kind === "single" ? [opt.id] : on ? selected.filter((s) => s !== opt.id) : [...selected, opt.id])}
                >
                  <span className="key">{KEYS[i] ?? i + 1}</span>
                  <span>{opt.text}</span>
                </button>
              );
            })}
      </div>
      {q.kind === "multi" && <p className="faint">Choose every answer that fits.</p>}
      {error && (
        <p role="alert" className="faint" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <div className="between">
        {index > 0 ? (
          <button type="button" className="btn btn-ghost" onClick={() => setIndex(index - 1)}>
            Back
          </button>
        ) : (
          <span />
        )}
        {last ? (
          <button type="button" className="btn btn-primary" disabled={!answered || submitting} onClick={submit}>
            {submitting ? "Checking…" : "Check answers"}
          </button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={!answered} onClick={() => setIndex(index + 1)}>
            Next question
            <Ms name="arrow_forward" size="sm" />
          </button>
        )}
      </div>
    </>,
  );
}

function Results({ result, questions, passThreshold, nextHref, onRetry }: { result: Result; questions: Question[]; passThreshold: number; nextHref: string | null; onRetry: () => void }) {
  const right = result.perQuestion.filter((p) => p.correct).length;
  return (
    <>
      <div className="between">
        <span className="eyebrow">{result.passed ? "Checkpoint passed" : "Not quite yet"}</span>
        <span className="faint num">
          {right} / {questions.length} correct · pass at {passThreshold}%
        </span>
      </div>
      <h1 className="display">{result.score}%</h1>
      <div className="stack">
        {questions.map((q) => {
          const r = result.perQuestion.find((p) => p.id === q.id);
          return (
            <div key={q.id} className="tip" style={r?.correct ? undefined : { background: "var(--danger-soft)", color: "var(--danger)" }}>
              <Ms name={r?.correct ? "check_circle" : "cancel"} fill />
              <div>
                <b>{q.prompt}</b>
                {r?.explanation && <div style={{ marginTop: 4 }}>{r.explanation}</div>}
              </div>
            </div>
          );
        })}
      </div>
      <div className="between">
        <button type="button" className="btn btn-ghost" onClick={onRetry}>
          Try again
        </button>
        {result.passed && nextHref && (
          <Link className="btn btn-primary" href={nextHref}>
            Continue
            <Ms name="arrow_forward" size="sm" />
          </Link>
        )}
      </div>
    </>
  );
}
