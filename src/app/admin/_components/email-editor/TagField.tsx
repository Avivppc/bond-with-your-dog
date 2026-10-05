"use client";

import { createContext, useContext, useId } from "react";
import { INPUT, LABEL, MUTED } from "../ui";
import type { FieldTarget } from "./doc-ops";

/**
 * Text inputs that remember being the last one focused, so the "Insert tag" chips know where to
 * put {{tag}}. The editor provides the focus callback through context.
 */

export type FieldElement = HTMLInputElement | HTMLTextAreaElement;
export type FieldFocusHandler = (target: FieldTarget, el: FieldElement) => void;

export const FieldFocusContext = createContext<FieldFocusHandler | null>(null);

interface TagFieldProps {
  target: FieldTarget;
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  hint?: string;
  inputMode?: "text" | "url";
}

export function TagField({ target, label, value, onChange, multiline = false, rows = 4, placeholder, hint, inputMode = "text" }: TagFieldProps) {
  const id = useId();
  const onFocusField = useContext(FieldFocusContext);
  const hintId = hint ? `${id}-hint` : undefined;
  const shared = {
    id,
    value,
    placeholder,
    "aria-describedby": hintId,
    onFocus: (e: React.FocusEvent<FieldElement>) => onFocusField?.(target, e.currentTarget),
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {multiline ? (
        <textarea {...shared} rows={rows} onChange={(e) => onChange(e.target.value)} className={`${INPUT} resize-y leading-relaxed`} />
      ) : (
        <input
          {...shared}
          type="text"
          inputMode={inputMode}
          spellCheck={inputMode === "url" ? false : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT}
        />
      )}
      {hint && (
        <p id={hintId} className={`text-xs ${MUTED}`}>
          {hint}
        </p>
      )}
    </div>
  );
}

export interface TagOption {
  tag: string;
  label: string;
  example: string;
}

interface TagChipsProps {
  tags: readonly TagOption[];
  onInsert: (tag: string) => void;
  /** Shown when there is no field to insert into yet. */
  message?: string | null;
}

/** "Insert tag" chips. mousedown is prevented so the text field keeps its focus and caret. */
export function TagChips({ tags, onInsert, message }: TagChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Insert a personalisation tag">
      <span className={`mr-1 text-xs font-medium uppercase tracking-wide ${MUTED}`}>Insert tag</span>
      {tags.map((t) => (
        <button
          key={t.tag}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onInsert(t.tag)}
          title={`{{${t.tag}}} — e.g. ${t.example}`}
          aria-label={`Insert ${t.label} tag`}
          className="rounded-full border border-[#d9d8d6] bg-white px-2.5 py-1 text-xs text-[#1a1a19] hover:border-[#0e666a] hover:bg-[#eef8f7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e666a]/40"
        >
          {t.label}
        </button>
      ))}
      {message && (
        <span role="status" className="ml-1 text-xs text-[#8a5a00]">
          {message}
        </span>
      )}
    </div>
  );
}
