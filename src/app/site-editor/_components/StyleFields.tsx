"use client";

import { DEFAULT_STYLE, SPACE_OPTIONS, STYLE_BACKGROUNDS, VISIBILITY_OPTIONS, type SectionStyle, type Space } from "@/lib/site/section-style";
import { INPUT } from "@/app/admin/_components/ui";

const SWATCH: Record<string, string> = {
  none: "repeating-linear-gradient(45deg,#e7e6e4 0 4px,#fff 4px 8px)",
  surface: "var(--color-surface)",
  low: "var(--color-surface-container-low)",
  high: "var(--color-surface-container-high)",
  white: "#ffffff",
  "primary-soft": "color-mix(in srgb, var(--color-primary-container) 15%, white)",
  "secondary-soft": "color-mix(in srgb, var(--color-secondary-container) 40%, white)",
  "tertiary-soft": "color-mix(in srgb, var(--color-tertiary-container) 25%, white)",
};

function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div>
      <p className="mb-1 text-[13px] font-medium">{label}</p>
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-full px-2.5 py-1 text-[12px] ${value === o.value ? "bg-[#343332] text-white" : "border border-[#d9d8d6] hover:bg-[#f3f3f2]"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** The Style tab: the same design controls for every section. */
export function StyleFields({ value, onChange }: { value: SectionStyle; onChange: (v: SectionStyle) => void }) {
  const set = <K extends keyof SectionStyle>(k: K, v: SectionStyle[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1 text-[13px] font-medium">Background behind the section</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Background">
          {STYLE_BACKGROUNDS.map((b) => (
            <button
              key={b.value}
              type="button"
              role="radio"
              aria-checked={value.background === b.value}
              title={b.label}
              aria-label={b.label}
              onClick={() => set("background", b.value)}
              className={`h-8 w-8 rounded-full border ${value.background === b.value ? "ring-2 ring-[#2563eb] ring-offset-2" : "border-[#d9d8d6]"}`}
              style={{ background: b.value === "custom" ? value.customColor : SWATCH[b.value] }}
            >
              {b.value === "custom" && <span className="material-symbols-outlined text-[16px] text-[#6c6a69] mix-blend-difference">colorize</span>}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[12px] text-[#6c6a69]">{STYLE_BACKGROUNDS.find((b) => b.value === value.background)?.label}</p>
        {value.background === "custom" && (
          <div className="mt-2 flex items-center gap-2">
            <input type="color" value={value.customColor} onChange={(e) => set("customColor", e.target.value)} className="h-8 w-10 cursor-pointer rounded border border-[#d9d8d6]" aria-label="Custom background color" />
            <input
              className={`${INPUT} w-28 py-1 font-mono text-[12px]`}
              defaultValue={value.customColor}
              key={value.customColor}
              maxLength={7}
              onBlur={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && set("customColor", e.target.value.toLowerCase())}
              aria-label="Custom background hex code"
            />
          </div>
        )}
      </div>
      <Segmented<Space> label="Extra space above" value={value.spaceTop} options={SPACE_OPTIONS} onChange={(v) => set("spaceTop", v)} />
      <Segmented<Space> label="Extra space below" value={value.spaceBottom} options={SPACE_OPTIONS} onChange={(v) => set("spaceBottom", v)} />
      <Segmented label="Show on" value={value.visibility} options={VISIBILITY_OPTIONS} onChange={(v) => set("visibility", v)} />
      <label className="block">
        <span className="mb-1 block text-[13px] font-medium">Anchor name (optional)</span>
        <input
          className={INPUT}
          value={value.anchor}
          maxLength={40}
          placeholder="e.g. pricing"
          onChange={(e) => set("anchor", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
        />
        <span className="mt-1 block text-[12px] text-[#6c6a69]">{value.anchor ? `Buttons linking to #${value.anchor} scroll here.` : "Lets a button scroll to this section."}</span>
      </label>
      <button type="button" className="text-[12px] font-medium underline" onClick={() => onChange(DEFAULT_STYLE)}>
        Reset the style
      </button>
    </div>
  );
}
