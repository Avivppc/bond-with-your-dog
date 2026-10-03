"use client";

import type { ActionNode, ConditionCheck, ConditionNode, EmailStepData, FlowNode } from "@/lib/flows/graph";
import { ACTION_HINT, ACTION_KINDS, ACTION_LABEL, MAX_NOTE, type ActionKind } from "@/lib/flows/actions";
import type { FlowSettings } from "@/lib/flows/schema";
import { GOAL_LABEL, OFFER_LABEL, TRIGGER_GROUPS, TRIGGERS, normalizeParams, triggerDef, type FlowTrigger, type GoalKind, type OfferKind } from "@/lib/flows/triggers";
import { percent, type StepStats } from "@/lib/flows/stats";
import { BTN_DANGER, BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL, MUTED } from "../../_components/ui";
import { ConsentChoice } from "../../_components/ConsentChoice";

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-[#efeeed] pt-4 first:border-0 first:pt-0">
      <h3 className={`text-[12px] font-semibold uppercase tracking-wide ${MUTED}`}>{title}</h3>
      {children}
    </section>
  );
}

const num = (value: string, fallback: number) => (Number.isFinite(Number(value)) && value !== "" ? Math.round(Number(value)) : fallback);

function ChapterSelect({ value, chapters, onChange, anyLabel }: { value: string | null | undefined; chapters: readonly ChapterOption[]; onChange: (id: string | null) => void; anyLabel?: string }) {
  return (
    <select className={INPUT} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">{anyLabel ?? "Choose a chapter"}</option>
      {chapters.map((c) => (
        <option key={c.id} value={c.id}>
          {c.title}
        </option>
      ))}
    </select>
  );
}

interface SettingsPanelProps {
  settings: FlowSettings;
  chapters: readonly ChapterOption[];
  onChange: (s: FlowSettings) => void;
}

/** Flow-wide settings. Shown when no step is selected. */
export function SettingsPanel({ settings, chapters, onChange }: SettingsPanelProps) {
  const def = triggerDef(settings.trigger);
  const set = (patch: Partial<FlowSettings>) => onChange({ ...settings, ...patch });
  const pickTrigger = (key: FlowTrigger) => {
    const d = triggerDef(key).defaults;
    set({ trigger: key, triggerParams: normalizeParams(key, {}), offer: d.offer, goal: d.goal, reentry: d.reentry });
  };
  const hasDiscount = settings.discountPercent !== null;
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-[#1a1a19]">Flow settings</h2>
      <Field label="Name">
        <input className={INPUT} value={settings.name} maxLength={120} onChange={(e) => set({ name: e.target.value })} />
      </Field>

      <Section title="Trigger">
        <Field label="Starts when someone…" hint={def.description}>
          <select className={INPUT} value={settings.trigger} onChange={(e) => pickTrigger(e.target.value as FlowTrigger)}>
            {TRIGGER_GROUPS.map((g) => (
              <optgroup key={g} label={g}>
                {TRIGGERS.filter((t) => t.group === g).map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
        {def.params.map((p) =>
          p.kind === "chapter" ? (
            <Field key={p.key} label={p.label}>
              <ChapterSelect value={settings.triggerParams.courseId} chapters={chapters} anyLabel="Any chapter" onChange={(id) => set({ triggerParams: { ...settings.triggerParams, courseId: id } })} />
            </Field>
          ) : (
            <Field key={p.key} label={`${p.label}${p.unit ? ` (${p.unit})` : ""}`}>
              <input
                className={INPUT}
                type="number"
                min={p.min}
                max={p.max}
                value={settings.triggerParams[p.key as "percent" | "days" | "hours"] ?? p.defaultValue ?? ""}
                onChange={(e) => set({ triggerParams: { ...settings.triggerParams, [p.key]: num(e.target.value, p.defaultValue ?? 0) } })}
              />
            </Field>
          ),
        )}
        <Field label="Who can enter again" hint="Members only enter once they reach the trigger after the flow goes live.">
          <select className={INPUT} value={settings.reentry} onChange={(e) => set({ reentry: e.target.value as FlowSettings["reentry"] })}>
            <option value="each_time">Every time it happens (e.g. each chapter)</option>
            <option value="once">Once per person, ever</option>
          </select>
        </Field>
      </Section>

      <Section title="What the flow offers">
        <Field label="Offer" hint="Sets {{offer_url}}, prices and the personal code.">
          <select className={INPUT} value={settings.offer.kind} onChange={(e) => set({ offer: { kind: e.target.value as OfferKind, courseId: null } })}>
            {(Object.keys(OFFER_LABEL) as OfferKind[]).map((k) => (
              <option key={k} value={k}>
                {OFFER_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
        {settings.offer.kind === "chapter" && (
          <Field label="Chapter">
            <ChapterSelect value={settings.offer.courseId} chapters={chapters} onChange={(id) => set({ offer: { kind: "chapter", courseId: id } })} />
          </Field>
        )}
        {settings.offer.kind !== "none" && (
          <>
            <label className="flex items-center gap-2 text-[14px]">
              <input type="checkbox" className="h-4 w-4 accent-[#343332]" checked={hasDiscount} onChange={(e) => set({ discountPercent: e.target.checked ? 20 : null, discountValidDays: e.target.checked ? 7 : null })} />
              Give each member a personal discount code
            </label>
            {hasDiscount && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Discount %">
                  <input className={INPUT} type="number" min={1} max={90} value={settings.discountPercent ?? ""} onChange={(e) => set({ discountPercent: num(e.target.value, 20) })} />
                </Field>
                <Field label="Valid for (days)">
                  <input className={INPUT} type="number" min={1} max={90} value={settings.discountValidDays ?? ""} onChange={(e) => set({ discountValidDays: num(e.target.value, 7) })} />
                </Field>
              </div>
            )}
          </>
        )}
        <Field label="Leave the flow early when" hint="Checked before every step.">
          <select className={INPUT} value={settings.goal.kind} onChange={(e) => set({ goal: { kind: e.target.value as GoalKind } })}>
            {(Object.keys(GOAL_LABEL) as GoalKind[]).map((k) => (
              <option key={k} value={k}>
                {GOAL_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Sending">
        <ConsentChoice value={settings.consent} onChange={(consent) => set({ consent })} />
        <label className="flex items-start gap-2 text-[14px]">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#343332]" checked={settings.smartSendingHours > 0} onChange={(e) => set({ smartSendingHours: e.target.checked ? 16 : 0 })} />
          <span>
            Smart sending: skip an email if the person got another one in the last{" "}
            <input
              className="w-14 rounded border border-[#d9d8d6] px-1 text-center"
              type="number"
              min={1}
              max={168}
              aria-label="Hours"
              disabled={settings.smartSendingHours === 0}
              value={settings.smartSendingHours || 16}
              onChange={(e) => set({ smartSendingHours: num(e.target.value, 16) })}
            />{" "}
            hours
          </span>
        </label>
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" className="h-4 w-4 accent-[#343332]" checked={settings.quietHours} onChange={(e) => set({ quietHours: e.target.checked })} />
          Only send 9:00–20:00 in their time zone
        </label>
      </Section>
      <p className={`text-[12px] ${MUTED}`}>Drag steps from the left onto the canvas or onto a connection, or use the + on any connection. Select a step or line and press Delete to remove it.</p>
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

const CHECKS: { value: ConditionCheck; label: string }[] = [
  { value: "opened", label: "Opened the last email" },
  { value: "clicked", label: "Clicked in the last email" },
  { value: "owns_chapter", label: "Has a chapter" },
  { value: "completed_chapter", label: "Finished a chapter" },
  { value: "practiced_recently", label: "Practiced recently" },
  { value: "has_purchased", label: "Has bought anything" },
  { value: "is_member", label: "Has an account (for quiz leads)" },
  { value: "has_tag", label: "Has a tag" },
];

function ConditionFields({ data, chapters, onData }: { data: ConditionNode["data"]; chapters: readonly ChapterOption[]; onData: (d: ConditionNode["data"]) => void }) {
  return (
    <>
      <Field label="Check" hint="YES and NO lead to different next steps.">
        <select className={INPUT} value={data.check} onChange={(e) => onData({ check: e.target.value as ConditionCheck })}>
          {CHECKS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      {(data.check === "owns_chapter" || data.check === "completed_chapter") && (
        <Field label="Chapter">
          <ChapterSelect value={data.courseId} chapters={chapters} onChange={(id) => onData({ ...data, courseId: id })} />
        </Field>
      )}
      {data.check === "practiced_recently" && (
        <Field label="In the last (days)">
          <input className={INPUT} type="number" min={1} max={365} value={data.days ?? 7} onChange={(e) => onData({ ...data, days: num(e.target.value, 7) })} />
        </Field>
      )}
      {data.check === "has_tag" && (
        <Field label="Tag" hint="Lower-case letters, numbers, spaces and dashes.">
          <input className={INPUT} maxLength={40} value={data.tag ?? ""} placeholder="vip" onChange={(e) => onData({ ...data, tag: e.target.value.toLowerCase() })} />
        </Field>
      )}
    </>
  );
}

/** Starting values when the action changes, so old fields don't linger. */
function freshAction(action: ActionKind): ActionNode["data"] {
  switch (action) {
    case "grant_chapter":
    case "revoke_chapter":
      return { action, courseId: null };
    case "add_tag":
    case "remove_tag":
      return { action, tag: "" };
    case "notify_team":
      return { action, message: "{{first_name}} ({{email}}) reached this step in {{flow_name}}." };
    case "webhook":
      return { action, url: "" };
  }
}

function ActionFields({ data, chapters, onData }: { data: ActionNode["data"]; chapters: readonly ChapterOption[]; onData: (d: ActionNode["data"]) => void }) {
  return (
    <>
      <Field label="Do this" hint={ACTION_HINT[data.action]}>
        <select className={INPUT} value={data.action} onChange={(e) => onData(freshAction(e.target.value as ActionKind))}>
          {ACTION_KINDS.map((k) => (
            <option key={k} value={k}>
              {ACTION_LABEL[k]}
            </option>
          ))}
        </select>
      </Field>
      {(data.action === "grant_chapter" || data.action === "revoke_chapter") && (
        <Field label="Chapter">
          <ChapterSelect value={data.courseId} chapters={chapters} onChange={(id) => onData({ ...data, courseId: id })} />
        </Field>
      )}
      {(data.action === "add_tag" || data.action === "remove_tag") && (
        <Field label="Tag" hint="Lower-case letters, numbers, spaces and dashes. Campaigns can be sent to a tag.">
          <input className={INPUT} maxLength={40} value={data.tag ?? ""} placeholder="vip" onChange={(e) => onData({ ...data, tag: e.target.value.toLowerCase() })} />
        </Field>
      )}
      {data.action === "notify_team" && (
        <Field label="Note for the team" hint="Goes to the team email in Settings → Email. Tags: {{first_name}}, {{dog_name}}, {{email}}, {{flow_name}}.">
          <textarea className={INPUT} rows={4} maxLength={MAX_NOTE} value={data.message ?? ""} onChange={(e) => onData({ ...data, message: e.target.value })} />
        </Field>
      )}
      {data.action === "webhook" && (
        <Field label="Webhook address" hint="A public https:// address (Zapier, Make…). We POST the person and the flow as JSON.">
          <input className={INPUT} type="url" maxLength={2000} value={data.url ?? ""} placeholder="https://hooks.zapier.com/…" onChange={(e) => onData({ ...data, url: e.target.value.trim() })} />
        </Field>
      )}
    </>
  );
}

interface StepPanelProps {
  node: FlowNode;
  chapters: readonly ChapterOption[];
  stats?: StepStats & { variants: Record<string, StepStats> };
  onData: (data: FlowNode["data"]) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onEditEmail: () => void;
  onTest: () => void;
  testing: boolean;
}

const TITLES: Record<FlowNode["type"], string> = { trigger: "Trigger", email: "Email", wait: "Wait", condition: "Condition", split: "A/B split", action: "Action", exit: "Exit" };

export function StepPanel({ node, chapters, stats, onData, onDelete, onDuplicate, onEditEmail, onTest, testing }: StepPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-[#1a1a19]">{TITLES[node.type]}</h2>
      {node.type === "trigger" && <p className={`text-[14px] ${MUTED}`}>Change the trigger in the flow settings (click the empty canvas).</p>}
      {node.type === "email" && (
        <>
          {stats && stats.sent > 0 && (
            <div className="flex flex-col gap-1 rounded-[8px] bg-[#f8f8f8] p-3">
              <StatLine label="All" s={stats} />
              {Object.entries(stats.variants).map(([v, s]) => (
                <StatLine key={v} label={`Variant ${v}`} s={s} />
              ))}
            </div>
          )}
          <div className="rounded-[8px] border border-[#e7e6e4] p-3">
            <p className={`text-[12px] ${MUTED}`}>Subject</p>
            <p className="font-medium">{(node.data as EmailStepData).subject || "—"}</p>
            {(node.data as EmailStepData).preheader && <p className={`mt-1 text-[13px] ${MUTED}`}>{(node.data as EmailStepData).preheader}</p>}
          </div>
          <button type="button" className={BTN_PRIMARY} onClick={onEditEmail}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              edit
            </span>
            Edit email
          </button>
          <button type="button" className={BTN_SECONDARY} onClick={onTest} disabled={testing}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              send
            </span>
            {testing ? "Sending…" : "Send a test to me"}
          </button>
        </>
      )}
      {node.type === "wait" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Days">
            <input className={INPUT} type="number" min={0} max={60} value={node.data.days} onChange={(e) => onData({ ...node.data, days: num(e.target.value, 0) })} />
          </Field>
          <Field label="Hours">
            <input className={INPUT} type="number" min={0} max={23} value={node.data.hours} onChange={(e) => onData({ ...node.data, hours: num(e.target.value, 0) })} />
          </Field>
          <p className={`col-span-2 text-[12px] ${MUTED}`}>The flow checks every 15 minutes, so waits land within 15 minutes of this time.</p>
        </div>
      )}
      {node.type === "condition" && <ConditionFields data={node.data} chapters={chapters} onData={onData} />}
      {node.type === "action" && <ActionFields data={node.data} chapters={chapters} onData={onData} />}
      {node.type === "split" && (
        <Field label={`Path A gets ${node.data.percentA}%`} hint="Each person always stays on the same path. Compare the emails' open and click rates.">
          <input type="range" min={1} max={99} value={node.data.percentA} onChange={(e) => onData({ percentA: num(e.target.value, 50) })} />
        </Field>
      )}
      {node.type === "exit" && <p className={`text-[14px] ${MUTED}`}>People who reach this step are done with the flow.</p>}
      {node.type !== "trigger" && (
        <div className="flex flex-wrap gap-2">
          {node.type !== "exit" && (
            <button type="button" className={BTN_SECONDARY} onClick={onDuplicate}>
              Duplicate
            </button>
          )}
          <button type="button" className={BTN_DANGER} onClick={onDelete}>
            Delete this step
          </button>
        </div>
      )}
    </div>
  );
}
