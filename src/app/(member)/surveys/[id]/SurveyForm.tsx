"use client";

import { useState, useTransition } from "react";
import type { SurveyAnswer, SurveyAnswers, SurveyQuestion } from "@/lib/surveys/survey";
import { submitSurvey } from "./actions";

interface SurveyFormProps {
  surveyId: string;
  questions: readonly SurveyQuestion[];
  thankYou: string;
  initial: SurveyAnswers | null;
}

function QuestionInput({ q, value, onChange }: { q: SurveyQuestion; value: SurveyAnswer | undefined; onChange: (v: SurveyAnswer | undefined) => void }) {
  const name = `q-${q.id}`;
  switch (q.type) {
    case "single":
      return (
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }} role="radiogroup" aria-labelledby={`${name}-label`}>
          {q.options.map((o) => (
            <button key={o} type="button" role="radio" aria-checked={value === o} className={`chip${value === o ? " on" : ""}`} onClick={() => onChange(o)}>
              {o}
            </button>
          ))}
        </div>
      );
    case "multi": {
      const picked = Array.isArray(value) ? value : [];
      return (
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }} role="group" aria-labelledby={`${name}-label`}>
          {q.options.map((o) => {
            const on = picked.includes(o);
            return (
              <button key={o} type="button" aria-pressed={on} className={`chip${on ? " on" : ""}`} onClick={() => onChange(on ? picked.filter((p) => p !== o) : [...picked, o])}>
                {o}
              </button>
            );
          })}
        </div>
      );
    }
    case "rating":
      return (
        <div className="row" style={{ gap: 8 }} role="radiogroup" aria-labelledby={`${name}-label`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} of 5`} className={`chip${value === n ? " on" : ""}`} onClick={() => onChange(n)}>
              {n}
            </button>
          ))}
        </div>
      );
    case "short":
      return <input id={name} className="input" maxLength={200} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} />;
    case "long":
      return <textarea id={name} className="input" maxLength={2000} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value)} />;
  }
}

/** The member's survey: chips for choices and ratings, text boxes for the rest. */
export function SurveyForm({ surveyId, questions, thankYou, initial }: SurveyFormProps) {
  const [answers, setAnswers] = useState<SurveyAnswers>(initial ?? {});
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  if (sent) {
    return (
      <div className="card" role="status" style={{ alignItems: "center", textAlign: "center", gap: 12 }}>
        <span className="ms" style={{ color: "var(--teal)", fontSize: 40 }} aria-hidden>
          favorite
        </span>
        <h2 className="display" style={{ fontSize: 28 }}>
          Sent
        </h2>
        <p className="lede">{thankYou || "Roni reads every answer."}</p>
      </div>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await submitSurvey(surveyId, answers);
      if (!res.ok) return setError(res.error);
      setSent(true);
    });
  }

  return (
    <form className="card" onSubmit={submit} style={{ gap: 26 }}>
      {questions.map((q, i) => (
        <div key={q.id} className="field">
          <label id={`q-${q.id}-label`} htmlFor={`q-${q.id}`}>
            {i + 1}. {q.prompt}
            {q.required ? "" : " (optional)"}
          </label>
          <QuestionInput q={q} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v as SurveyAnswer }))} />
        </div>
      ))}
      {error && (
        <span role="alert" className="faint" style={{ color: "var(--danger)" }}>
          {error}
        </span>
      )}
      <button className="btn btn-primary" type="submit" disabled={pending} style={{ alignSelf: "flex-start" }}>
        {pending ? "Sending…" : initial ? "Update my answers" : "Send my answers"}
      </button>
    </form>
  );
}
