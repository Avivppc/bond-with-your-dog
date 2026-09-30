"use client";

import { useState } from "react";
import { BTN_SECONDARY, INPUT, LABEL } from "@/app/admin/_components/ui";
import { useRows } from "./useRows";

/**
 * Small list editors shared by the Moves, lesson and course forms. Each row submits a field with
 * the same `name` (read on the server with formData.getAll). `formId` lets the inputs join a form
 * elsewhere on the page (the lesson editor's single form).
 */

const ICON_BTN =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#6c6a69] hover:bg-[#f0efee] hover:text-[#1a1a19] disabled:opacity-30 disabled:hover:bg-transparent";

export function Icon({ name }: { name: string }) {
  return (
    <span className="material-symbols-outlined text-[18px]" aria-hidden>
      {name}
    </span>
  );
}

interface RowControlsProps {
  index: number;
  count: number;
  itemLabel: string;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}

/** Move up / move down / remove buttons for one row. */
export function RowControls({ index, count, itemLabel, onMove, onRemove }: RowControlsProps) {
  return (
    <div className="flex shrink-0 items-center">
      <button type="button" className={ICON_BTN} disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={`Move ${itemLabel} ${index + 1} up`}>
        <Icon name="arrow_upward" />
      </button>
      <button type="button" className={ICON_BTN} disabled={index === count - 1} onClick={() => onMove(index, index + 1)} aria-label={`Move ${itemLabel} ${index + 1} down`}>
        <Icon name="arrow_downward" />
      </button>
      <button type="button" className={ICON_BTN} onClick={() => onRemove(index)} aria-label={`Remove ${itemLabel} ${index + 1}`}>
        <Icon name="close" />
      </button>
    </div>
  );
}

export function AddRowButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${BTN_SECONDARY} self-start`}>
      <Icon name="add" />
      {children}
    </button>
  );
}

interface TextListEditorProps {
  name: string;
  label: string;
  initial: readonly string[];
  maxItems: number;
  maxLength: number;
  itemLabel: string;
  addLabel: string;
  placeholder?: string;
  hint?: string;
  formId?: string;
  /** Numbered rows (ordered steps) instead of bullets. */
  numbered?: boolean;
}

/** An ordered list of short texts: add, edit, reorder and remove rows. */
export function TextListEditor({ name, label, initial, maxItems, maxLength, itemLabel, addLabel, placeholder, hint, formId, numbered = false }: TextListEditorProps) {
  const { rows, add, remove, move, update } = useRows(initial);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={`${LABEL} mb-1.5`}>{label}</legend>
      {rows.length === 0 && <p className="text-xs text-[#6c6a69]">Nothing added yet.</p>}
      <ol className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <li key={row.key} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-right text-xs font-medium text-[#6c6a69]" aria-hidden>
              {numbered ? `${i + 1}.` : "•"}
            </span>
            <input
              form={formId}
              name={name}
              value={row.value}
              onChange={(e) => update(i, e.target.value)}
              maxLength={maxLength}
              placeholder={placeholder}
              aria-label={`${itemLabel} ${i + 1}`}
              className={INPUT}
            />
            <RowControls index={i} count={rows.length} itemLabel={itemLabel} onMove={move} onRemove={remove} />
          </li>
        ))}
      </ol>
      <AddRowButton onClick={() => add("")} disabled={rows.length >= maxItems}>
        {addLabel}
      </AddRowButton>
      {hint && <p className="text-xs text-[#6c6a69]">{hint}</p>}
    </fieldset>
  );
}

interface ChipListEditorProps {
  name: string;
  label: string;
  initial: readonly string[];
  maxItems: number;
  maxLength: number;
  placeholder: string;
  hint?: string;
  formId?: string;
}

/** Short tags (e.g. cues) shown as chips; type and press Enter or "Add" to append one. */
export function ChipListEditor({ name, label, initial, maxItems, maxLength, placeholder, hint, formId }: ChipListEditorProps) {
  const { rows, add, remove } = useRows(initial);
  const [draft, setDraft] = useState("");
  const full = rows.length >= maxItems;

  function commit() {
    const value = draft.trim();
    if (!value || full || rows.some((r) => r.value.toLowerCase() === value.toLowerCase())) return;
    add(value);
    setDraft("");
  }

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={`${LABEL} mb-1.5`}>{label}</legend>
      <div className="flex flex-wrap gap-2">
        {rows.length === 0 && <span className="text-xs text-[#6c6a69]">No cues yet.</span>}
        {rows.map((row, i) => (
          <span key={row.key} className="inline-flex items-center gap-1 rounded-full bg-[#f0efee] py-1 pl-3 pr-1 text-sm text-[#1a1a19]">
            {row.value}
            <input type="hidden" form={formId} name={name} value={row.value} />
            <button type="button" onClick={() => remove(i)} aria-label={`Remove ${row.value}`} className="inline-flex h-6 w-6 items-center justify-center rounded-full hover:bg-[#e2e1df]">
              <Icon name="close" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            commit();
          }}
          maxLength={maxLength}
          disabled={full}
          placeholder={full ? `Up to ${maxItems}` : placeholder}
          aria-label={`New ${label.toLowerCase()}`}
          className={INPUT}
        />
        <button type="button" onClick={commit} disabled={full || !draft.trim()} className={BTN_SECONDARY}>
          Add
        </button>
      </div>
      {hint && <p className="text-xs text-[#6c6a69]">{hint}</p>}
    </fieldset>
  );
}
