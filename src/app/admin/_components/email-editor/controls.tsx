"use client";

import { useId } from "react";
import { LABEL, MUTED } from "../ui";

/** Small form controls shared by the block field editors. */

interface SegmentedProps<T extends string | number> {
  label: string;
  value: T;
  options: readonly { value: T; label: string; icon?: string }[];
  onChange: (value: T) => void;
  /** Keep the label for screen readers only. */
  hideLabel?: boolean;
}

/** A row of toggle buttons for picking one option (alignment, heading size). */
export function Segmented<T extends string | number>({ label, value, options, onChange, hideLabel = false }: SegmentedProps<T>) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <span id={id} className={hideLabel ? "sr-only" : LABEL}>
        {label}
      </span>
      <div role="group" aria-labelledby={id} className="inline-flex w-fit rounded-full border border-[#d9d8d6] bg-white p-0.5">
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={String(o.value)}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(o.value)}
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e666a]/40 ${
                active ? "bg-[#343332] text-white" : "text-[#1a1a19] hover:bg-[#f3f3f2]"
              }`}
            >
              {o.icon && (
                <span className="material-symbols-outlined text-[18px]" aria-hidden>
                  {o.icon}
                </span>
              )}
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const ALIGN_OPTIONS = [
  { value: "left", label: "Left", icon: "format_align_left" },
  { value: "center", label: "Center", icon: "format_align_center" },
] as const;

interface RangeFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}

export function RangeField({ label, value, min, max, step, unit, onChange }: RangeFieldProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={LABEL}>
          {label}
        </label>
        <span className={`text-xs tabular-nums ${MUTED}`}>
          {value}
          {unit}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={`${value}${unit}`}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#0e666a]"
      />
    </div>
  );
}

export function Note({ children }: { children: React.ReactNode }) {
  return <p className={`rounded-[8px] bg-[#f8f8f8] px-3 py-2 text-xs leading-relaxed ${MUTED}`}>{children}</p>;
}
