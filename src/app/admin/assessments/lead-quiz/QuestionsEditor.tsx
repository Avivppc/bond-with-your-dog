"use client";

import {
  LIMITS,
  MAX_QUESTIONS,
  MIN_QUESTIONS,
  OPTION_IDS,
  TIER_SHORT_LABELS,
  type QuestionKey,
  type QuizConfigQuestion,
} from "@/lib/quiz/config";
import { OPTION_TO_TIER } from "@/lib/quiz/scoring";
import { moveItem, newQuestion, removeAt, replaceAt } from "@/lib/quiz/draft";
import { BTN_SECONDARY, Card, MUTED, PILL, StatusPill } from "../../_components/ui";
import { TextField } from "./fields";

/** What each original question does in choosing the result (src/lib/quiz/scoring.ts). */
const RULE_HINTS: Record<QuestionKey, string> = {
  relationship: "Helps choose the result: answer A (just getting started) is never sent straight to Let's Dance.",
  experience: "Helps choose the result: sets how far the dog is ready to go.",
  independence: "Helps choose the result: only answer C (works without food or a toy) opens Let's Dance.",
  goal: "Helps choose the result: what they want to work on.",
  excites: "Helps choose the result: what they want to work on.",
  worthIt: "Helps choose the result: what they want to work on.",
};

const SMALL_BUTTON = `${PILL} disabled:opacity-40 disabled:hover:bg-white`;

interface QuestionItemProps {
  question: QuizConfigQuestion;
  index: number;
  total: number;
  canRemove: boolean;
  onChange: (question: QuizConfigQuestion) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}

function QuestionItem({ question, index, total, canRemove, onChange, onMove, onRemove }: QuestionItemProps) {
  const setOption = (id: (typeof OPTION_IDS)[number], text: string) =>
    onChange({ ...question, options: { ...question.options, [id]: text } });

  return (
    <li className="rounded-[12px] border border-[#e7e6e4] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-[#1a1a19]">Question {index + 1}</span>
          {question.key && <StatusPill tone="info">Scoring</StatusPill>}
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" className={SMALL_BUTTON} disabled={index === 0} onClick={() => onMove(index - 1)} aria-label={`Move question ${index + 1} up`}>
            ↑ Up
          </button>
          <button type="button" className={SMALL_BUTTON} disabled={index === total - 1} onClick={() => onMove(index + 1)} aria-label={`Move question ${index + 1} down`}>
            ↓ Down
          </button>
          <button type="button" className={SMALL_BUTTON} disabled={!canRemove} onClick={onRemove} aria-label={`Remove question ${index + 1}`}>
            Remove
          </button>
        </div>
      </div>
      {question.key && <p className={`mb-3 text-[12px] ${MUTED}`}>{RULE_HINTS[question.key]}</p>}
      <div className="flex flex-col gap-4">
        <TextField label="Question" value={question.prompt} maxLength={LIMITS.prompt} onChange={(prompt) => onChange({ ...question, prompt })} />
        {OPTION_IDS.map((id) => (
          <TextField
            key={id}
            label={`Answer ${id} → ${TIER_SHORT_LABELS[OPTION_TO_TIER[id]]}`}
            value={question.options[id]}
            maxLength={LIMITS.option}
            rows={2}
            onChange={(text) => setOption(id, text)}
          />
        ))}
      </div>
    </li>
  );
}

interface QuestionsEditorProps {
  questions: QuizConfigQuestion[];
  onChange: (questions: QuizConfigQuestion[]) => void;
}

export function QuestionsEditor({ questions, onChange }: QuestionsEditorProps) {
  const canAdd = questions.length < MAX_QUESTIONS;
  const canRemove = questions.length > MIN_QUESTIONS;

  function remove(index: number) {
    const question = questions[index];
    const confirmText = question.key
      ? "This question helps choose the result. Remove it anyway? Results will be chosen without it."
      : `Remove question ${index + 1}?`;
    if (!window.confirm(confirmText)) return;
    onChange(removeAt(questions, index));
  }

  return (
    <Card
      title="Questions"
      description={`${questions.length} questions (${MIN_QUESTIONS} to ${MAX_QUESTIONS}). Answer A always points to Foundations, B to Moves and C to Let's Dance. Questions you add help pick between the chapters the dog is ready for.`}
    >
      <ol className="flex flex-col gap-4">
        {questions.map((question, index) => (
          <QuestionItem
            key={question.id}
            question={question}
            index={index}
            total={questions.length}
            canRemove={canRemove}
            onChange={(next) => onChange(replaceAt(questions, index, next))}
            onMove={(to) => onChange(moveItem(questions, index, to))}
            onRemove={() => remove(index)}
          />
        ))}
      </ol>
      <div className="mt-4 flex items-center gap-3">
        <button type="button" className={BTN_SECONDARY} disabled={!canAdd} onClick={() => onChange([...questions, newQuestion(questions)])}>
          Add a question
        </button>
        {!canAdd && <span className={`text-[12px] ${MUTED}`}>The quiz can have up to {MAX_QUESTIONS} questions.</span>}
      </div>
    </Card>
  );
}
