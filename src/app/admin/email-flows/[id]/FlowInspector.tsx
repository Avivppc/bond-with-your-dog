"use client";

import { useRef } from "react";
import type { EmailNode, FlowNode } from "@/lib/flows/graph";
import type { FlowSettings } from "@/lib/flows/schema";
import { EXAMPLE_VARS, FLOW_TAGS, renderFlowEmail } from "@/lib/flows/template";
import { TRIGGER_LABEL } from "@/lib/flows/templates";
import { percent, type StepStats } from "@/lib/flows/stats";
import { BTN_DANGER, BTN_SECONDARY, INPUT, LABEL, MUTED } from "../../_components/ui";

export interface ChapterOption {
  id: string;
  title: string;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      {children}
      {hint && <span className={`text-[12px] ${MUTED}`}>{hint}</span>}
    </label>
  );
}

const num = (value: string, fallback: number) => (Number.isFinite(Number(value)) && value !== "" ? Math.round(Number(value)) : fallback);

/** Flow-wide settings: name, trigger, chapter, and the personal code. Shown when no step is selected. */
export function SettingsPanel({ settings, chapters, onChange }: { settings: FlowSettings; chapters: readonly ChapterOption[]; onChange: (s: FlowSettings) => void }) {
  const hasDiscount = settings.discountPercent !== null;
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-[#1a1a19]">Flow settings</h2>
      <Field label="Name">
        <input className={INPUT} value={settings.name} maxLength={120} onChange={(e) => onChange({ ...settings, name: e.target.value })} />
      </Field>
      <Field label="Trigger" hint="Members enter once per chapter, only when they reach this after the flow goes live.">
        <select className={INPUT} value={settings.trigger} onChange={(e) => onChange({ ...settings, trigger: e.target.value as FlowSettings["trigger"] })}>
          {Object.entries(TRIGGER_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Chapter" hint="The flow offers the chapter that comes after it.">
        <select className={INPUT} value={settings.courseId ?? ""} onChange={(e) => onChange({ ...settings, courseId: e.target.value || null })}>
          <option value="">Any chapter</option>
          {chapters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </Field>
      <label className="flex items-center gap-2 text-[14px]">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[#343332]"
          checked={hasDiscount}
          onChange={(e) => onChange({ ...settings, discountPercent: e.target.checked ? 20 : null, discountValidDays: e.target.checked ? 7 : null })}
        />
        Give each member a personal discount code
      </label>
      {hasDiscount && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Discount %">
            <input className={INPUT} type="number" min={1} max={90} value={settings.discountPercent ?? ""} onChange={(e) => onChange({ ...settings, discountPercent: num(e.target.value, 20) })} />
          </Field>
          <Field label="Valid for (days)">
            <input className={INPUT} type="number" min={1} max={90} value={settings.discountValidDays ?? ""} onChange={(e) => onChange({ ...settings, discountValidDays: num(e.target.value, 7) })} />
          </Field>
        </div>
      )}
      <p className={`text-[12px] ${MUTED}`}>Select a step on the canvas to edit it. Drag from a dot at the bottom of a step to the top of another to connect them; select a step or line and press Delete to remove it.</p>
    </div>
  );
}

function StatLine({ label, s }: { label: string; s: StepStats }) {
  return (
    <div className="flex justify-between gap-2 text-[13px]">
      <span className={MUTED}>{label}</span>
      <span>
        {s.sent} sent · {percent(s.openRate)} open · {percent(s.clickRate)} click
      </span>
    </div>
  );
}

function EmailEditor({ node, stats, onData, onTest, testing }: { node: EmailNode; stats?: StepStats & { variants: Record<string, StepStats> }; onData: (d: EmailNode["data"]) => void; onTest: () => void; testing: boolean }) {
  const body = useRef<HTMLTextAreaElement>(null);
  const preview = renderFlowEmail(node.data, EXAMPLE_VARS);
  const insertTag = (tag: string) => {
    const el = body.current;
    const text = `{{${tag}}}`;
    if (!el) return onData({ ...node.data, body: node.data.body + text });
    const next = node.data.body.slice(0, el.selectionStart) + text + node.data.body.slice(el.selectionEnd);
    onData({ ...node.data, body: next });
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = el.selectionStart + text.length;
    });
  };
  return (
    <div className="flex flex-col gap-4">
      {stats && stats.sent > 0 && (
        <div className="flex flex-col gap-1 rounded-[8px] bg-[#f8f8f8] p-3">
          <StatLine label="All" s={stats} />
          {Object.entries(stats.variants).map(([v, s]) => (
            <StatLine key={v} label={`Variant ${v}`} s={s} />
          ))}
          {stats.bounced > 0 && <span className={`text-[12px] ${MUTED}`}>{stats.bounced} bounced</span>}
        </div>
      )}
      <Field label="Subject">
        <input className={INPUT} value={node.data.subject} maxLength={200} onChange={(e) => onData({ ...node.data, subject: e.target.value })} />
      </Field>
      <Field label="Preview text" hint="The grey line after the subject in the inbox.">
        <input className={INPUT} value={node.data.preheader} maxLength={200} onChange={(e) => onData({ ...node.data, preheader: e.target.value })} />
      </Field>
      <Field label="Text" hint="Blank lines start a new paragraph.">
        <textarea ref={body} className={`${INPUT} min-h-[180px]`} value={node.data.body} maxLength={10000} onChange={(e) => onData({ ...node.data, body: e.target.value })} />
      </Field>
      <div className="flex flex-wrap gap-1.5">
        {FLOW_TAGS.filter((t) => t.tag !== "offer_url").map((t) => (
          <button key={t.tag} type="button" onClick={() => insertTag(t.tag)} className="rounded-full border border-[#d9d8d6] px-2.5 py-1 text-[12px] hover:bg-[#f3f3f2]" title={`Inserts {{${t.tag}}}, e.g. ${t.example}`}>
            + {t.label}
          </button>
        ))}
      </div>
      <Field label="Button" hint="Links to checkout for the next chapter with the member's code. Leave empty for no button.">
        <input className={INPUT} value={node.data.ctaLabel} maxLength={80} onChange={(e) => onData({ ...node.data, ctaLabel: e.target.value })} />
      </Field>
      <div className="rounded-[8px] border border-[#e7e6e4] bg-[#fafaf9] p-3">
        <p className={`mb-1 text-[12px] font-semibold uppercase tracking-wide ${MUTED}`}>Preview</p>
        <p className="mb-2 text-[14px] font-semibold">{preview.subject || "—"}</p>
        <p className="whitespace-pre-line text-[13px] leading-relaxed text-[#1a1a19]">{preview.text}</p>
      </div>
      <button type="button" className={BTN_SECONDARY} onClick={onTest} disabled={testing}>
        <span className="material-symbols-outlined text-[18px]" aria-hidden>
          send
        </span>
        {testing ? "Sending…" : "Send a test to me"}
      </button>
    </div>
  );
}

interface StepPanelProps {
  node: FlowNode;
  stats?: StepStats & { variants: Record<string, StepStats> };
  onData: (data: FlowNode["data"]) => void;
  onDelete: () => void;
  onTest: () => void;
  testing: boolean;
}

export function StepPanel({ node, stats, onData, onDelete, onTest, testing }: StepPanelProps) {
  const titles: Record<FlowNode["type"], string> = { trigger: "Trigger", email: "Email", wait: "Wait", condition: "Condition", split: "A/B split", exit: "Exit" };
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-[#1a1a19]">{titles[node.type]}</h2>
      {node.type === "trigger" && <p className={`text-[14px] ${MUTED}`}>Change the trigger and chapter in the flow settings (click the empty canvas).</p>}
      {node.type === "email" && <EmailEditor node={node} stats={stats} onData={onData} onTest={onTest} testing={testing} />}
      {node.type === "wait" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Days">
            <input className={INPUT} type="number" min={0} max={60} value={node.data.days} onChange={(e) => onData({ ...node.data, days: num(e.target.value, 0) })} />
          </Field>
          <Field label="Hours">
            <input className={INPUT} type="number" min={0} max={23} value={node.data.hours} onChange={(e) => onData({ ...node.data, hours: num(e.target.value, 0) })} />
          </Field>
          <p className={`col-span-2 text-[12px] ${MUTED}`}>Flows run once a day, so waits land on the next daily run after this time.</p>
        </div>
      )}
      {node.type === "condition" && (
        <Field label="Check" hint="About the last email this member got in the flow. A click counts as an open.">
          <select className={INPUT} value={node.data.check} onChange={(e) => onData({ check: e.target.value as "opened" | "clicked" })}>
            <option value="opened">Opened it</option>
            <option value="clicked">Clicked a link in it</option>
          </select>
        </Field>
      )}
      {node.type === "split" && (
        <Field label={`Path A gets ${node.data.percentA}%`} hint="Each member always stays on the same path. Compare the emails' open and click rates.">
          <input type="range" min={1} max={99} value={node.data.percentA} onChange={(e) => onData({ percentA: num(e.target.value, 50) })} />
        </Field>
      )}
      {node.type === "exit" && <p className={`text-[14px] ${MUTED}`}>Members who reach this step are done with the flow. Anyone who buys the next chapter leaves the flow right away.</p>}
      {node.type !== "trigger" && (
        <button type="button" className={`${BTN_DANGER} self-start`} onClick={onDelete}>
          Delete this step
        </button>
      )}
    </div>
  );
}
