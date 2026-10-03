"use client";

import { useState, useTransition } from "react";
import { MAX_QUESTIONS, QUESTION_TYPE_LABEL, newQuestion, type SurveyDefinition, type SurveyQuestion, type SurveyQuestionType } from "@/lib/surveys/survey";
import type { SurveyStatus } from "@/lib/surveys/server";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL, MUTED } from "../../../_components/ui";
import { saveSurvey, type SurveyActionResult } from "../../actions";

interface ChapterOption {
  id: string;
  title: string;
}

interface SurveyEditorProps {
  id: string;
  initial: SurveyDefinition;
  status: SurveyStatus;
  courseId: string | null;
  chapters: readonly ChapterOption[];
  hasResponses: boolean;
}

const TYPES = Object.keys(QUESTION_TYPE_LABEL) as SurveyQuestionType[];

const freshId = () => `q${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;

function move<T>(items: readonly T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return [...items];
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function QuestionCard({ q, index, count, onChange, onMove, onRemove }: {
  q: SurveyQuestion;
  index: number;
  count: number;
  onChange: (q: SurveyQuestion) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const choice = q.type === "single" || q.type === "multi";
  return (
    <li className="flex flex-col gap-3 rounded-[12px] border border-[#e7e6e4] bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-[12px] font-semibold uppercase tracking-wide ${MUTED}`}>Question {index + 1}</span>
        <select
          aria-label="Question type"
          className={`${INPUT} ml-auto w-auto`}
          value={q.type}
          onChange={(e) => {
            const type = e.target.value as SurveyQuestionType;
            const keepsOptions = (type === "single" || type === "multi") && choice;
            onChange({ ...q, type, options: keepsOptions ? q.options : newQuestion(type, q.id).options });
          }}
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {QUESTION_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <button type="button" className={BTN_SECONDARY} disabled={index === 0} onClick={() => onMove(index - 1)} aria-label="Move up">
          ↑
        </button>
        <button type="button" className={BTN_SECONDARY} disabled={index === count - 1} onClick={() => onMove(index + 1)} aria-label="Move down">
          ↓
        </button>
        <button type="button" className={BTN_SECONDARY} onClick={onRemove} aria-label={`Delete question ${index + 1}`}>
          Delete
        </button>
      </div>
      <input className={INPUT} maxLength={300} placeholder="The question" value={q.prompt} onChange={(e) => onChange({ ...q, prompt: e.target.value })} aria-label="Question wording" />
      {choice && (
        <div className="flex flex-col gap-2">
          {q.options.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={`${INPUT} min-w-0 flex-1`}
                maxLength={120}
                placeholder={`Choice ${i + 1}`}
                value={opt}
                aria-label={`Choice ${i + 1}`}
                onChange={(e) => onChange({ ...q, options: q.options.map((o, j) => (j === i ? e.target.value : o)) })}
              />
              <button type="button" className={BTN_SECONDARY} disabled={q.options.length <= 2} onClick={() => onChange({ ...q, options: q.options.filter((_, j) => j !== i) })} aria-label={`Remove choice ${i + 1}`}>
                ✕
              </button>
            </div>
          ))}
          {q.options.length < 10 && (
            <button type="button" className={`${BTN_SECONDARY} self-start`} onClick={() => onChange({ ...q, options: [...q.options, ""] })}>
              Add a choice
            </button>
          )}
        </div>
      )}
      <label className="flex items-center gap-2 text-[14px]">
        <input type="checkbox" checked={q.required} onChange={(e) => onChange({ ...q, required: e.target.checked })} />
        Required
      </label>
    </li>
  );
}

export function SurveyEditor({ id, initial, status: initialStatus, courseId: initialCourse, chapters, hasResponses }: SurveyEditorProps) {
  const [survey, setSurvey] = useState(initial);
  const [status, setStatus] = useState(initialStatus);
  const [courseId, setCourseId] = useState(initialCourse);
  const [result, setResult] = useState<SurveyActionResult | null>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<SurveyDefinition>) => setSurvey((s) => ({ ...s, ...patch }));
  const setQuestions = (questions: SurveyQuestion[]) => set({ questions });

  const save = (nextStatus: SurveyStatus) =>
    start(async () => {
      const res = await saveSurvey(id, survey, nextStatus, courseId);
      setResult(res);
      if (res.ok) setStatus(nextStatus);
    });

  return (
    <div className="flex flex-col gap-4">
      {result && <div role="status" className={`rounded-[8px] px-4 py-3 text-[14px] ${result.ok ? "bg-[#e3f5e8] text-[#1c6b35]" : "bg-[#fde8e8] text-[#a4262c]"}`}>{result.ok ? result.message : result.error}</div>}
      {hasResponses && <p className={`text-[13px] ${MUTED}`}>Members already answered. Changing or removing questions keeps their old answers, but results only show the current questions.</p>}

      <div className="grid gap-4 rounded-[12px] border border-[#e7e6e4] bg-white p-5 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 md:col-span-2">
          <span className={LABEL}>Title</span>
          <input className={INPUT} maxLength={120} value={survey.title} onChange={(e) => set({ title: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Intro (optional)</span>
          <textarea className={INPUT} rows={3} maxLength={1000} value={survey.intro} onChange={(e) => set({ intro: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Thank-you message</span>
          <textarea className={INPUT} rows={3} maxLength={500} value={survey.thankYou} onChange={(e) => set({ thankYou: e.target.value })} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Offer it</span>
          <select className={INPUT} value={courseId ?? ""} onChange={(e) => setCourseId(e.target.value || null)}>
            <option value="">Only by link</option>
            {chapters.map((c) => (
              <option key={c.id} value={c.id}>
                At the end of {c.title}
              </option>
            ))}
          </select>
          <span className={`text-[12px] ${MUTED}`}>Members see it on the lesson-complete screen once they finish the chapter.</span>
        </label>
        <div className="flex flex-col gap-1.5">
          <span className={LABEL}>Link for members</span>
          <code className="rounded-[8px] bg-[#f6f6f5] px-3 py-2 text-[13px]">/surveys/{id}</code>
          <span className={`text-[12px] ${MUTED}`}>Put it in an email or a community post. Members sign in to answer.</span>
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {survey.questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            q={q}
            index={i}
            count={survey.questions.length}
            onChange={(next) => setQuestions(survey.questions.map((x) => (x.id === q.id ? next : x)))}
            onMove={(to) => setQuestions(move(survey.questions, i, to))}
            onRemove={() => setQuestions(survey.questions.filter((x) => x.id !== q.id))}
          />
        ))}
      </ol>
      {survey.questions.length < MAX_QUESTIONS && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[13px] ${MUTED}`}>Add a question:</span>
          {TYPES.map((t) => (
            <button key={t} type="button" className={BTN_SECONDARY} onClick={() => setQuestions([...survey.questions, newQuestion(t, freshId())])}>
              {QUESTION_TYPE_LABEL[t]}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-[12px] border border-[#e7e6e4] bg-white p-4">
        <span className={`text-[13px] ${MUTED}`}>Status: {status === "published" ? "Live" : status === "closed" ? "Closed" : "Draft"}</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" className={BTN_SECONDARY} disabled={pending} onClick={() => save(status)}>
            Save
          </button>
          {status !== "published" ? (
            <button type="button" className={BTN_PRIMARY} disabled={pending} onClick={() => save("published")}>
              Publish
            </button>
          ) : (
            <button type="button" className={BTN_SECONDARY} disabled={pending} onClick={() => save("closed")}>
              Close survey
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
