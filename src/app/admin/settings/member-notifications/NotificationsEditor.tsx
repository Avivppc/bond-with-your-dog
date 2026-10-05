"use client";

import { useRef, useState, useTransition } from "react";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL, MUTED, Notice } from "../../_components/ui";
import { fillTemplate, notificationSettingsSchema, sampleVars, TOPIC_DEFS, type NotificationSettings, type Topic, type TopicDef, type TopicSettings } from "@/lib/notification-settings/topics";
import { saveMemberNotificationSettings, sendTestNotification } from "./actions";
import { TimingControls } from "./TimingControls";

type Field = "title" | "body";

function Switch({ on, onChange, label }: { on: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${on ? "bg-[#343332]" : "bg-[#d9d8d6]"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

/** How it lands on a phone, with sample values. */
function Preview({ title, body }: { title: string; body: string | null }) {
  return (
    <div className="flex items-start gap-3 rounded-[14px] bg-[#f3f3f2] px-3 py-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- static app icon */}
      <img src="/icons/icon-192.png" alt="" className="h-9 w-9 rounded-[9px] bg-white" />
      <div className="min-w-0 flex-1">
        <div className="flex justify-between text-[12px] text-[#6c6a69]">
          <span className="font-medium uppercase tracking-wide">Bonded</span>
          <span>now</span>
        </div>
        <p className="truncate text-[14px] font-semibold text-[#1a1a19]">{title}</p>
        {body && <p className="line-clamp-2 text-[13px] text-[#3d3c3b]">{body}</p>}
      </div>
    </div>
  );
}

interface CardProps {
  def: TopicDef;
  value: TopicSettings;
  settings: NotificationSettings;
  onChange: (patch: Partial<TopicSettings>) => void;
  onTiming: (next: NotificationSettings) => void;
}

function TopicCard({ def, value, settings, onChange, onTiming }: CardProps) {
  const lastField = useRef<Field>("title");
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [testing, startTest] = useTransition();
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const vars = sampleVars(def.topic);

  function insertTag(key: string) {
    const field = lastField.current;
    const el = field === "title" ? titleRef.current : bodyRef.current;
    const text = value[field];
    const tag = `{{${key}}}`;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    onChange({ [field]: text.slice(0, start) + tag + text.slice(end) });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + tag.length, start + tag.length);
    });
  }

  function test() {
    setTestMessage(null);
    startTest(async () => {
      const res = await sendTestNotification({ topic: def.topic, title: value.title, body: value.body });
      setTestMessage(res.ok ? "Sent to your bell and phone. It can take a few seconds." : res.error);
    });
  }

  return (
    <li className="rounded-[12px] border border-[#e7e6e4] bg-white p-5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold text-[#1a1a19]">{def.label}</h2>
            {def.audience === "team" && <span className="rounded-full bg-[#f3f3f2] px-2 py-0.5 text-[11px] font-medium text-[#6c6a69]">Team</span>}
          </div>
          <p className={`text-[13px] ${MUTED}`}>{def.trigger}</p>
        </div>
        <Switch on={value.enabled} onChange={(enabled) => onChange({ enabled })} label={`${def.label}: ${value.enabled ? "on" : "off"}`} />
      </div>

      {value.enabled && (
        <div className="mt-4 grid gap-5 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-4 text-[13px]">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-[#343332]" checked={value.push} onChange={(e) => onChange({ push: e.target.checked })} />
                Send to the phone
              </label>
              {def.hasEmail && (
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 accent-[#343332]" checked={value.email} onChange={(e) => onChange({ email: e.target.checked })} />
                  Also by email
                </label>
              )}
            </div>
            <label className="flex flex-col gap-1">
              <span className={LABEL}>Title</span>
              <input ref={titleRef} className={INPUT} value={value.title} maxLength={120} onFocus={() => (lastField.current = "title")} onChange={(e) => onChange({ title: e.target.value })} />
            </label>
            <label className="flex flex-col gap-1">
              <span className={LABEL}>Text</span>
              <textarea ref={bodyRef} className={`${INPUT} resize-y`} rows={2} value={value.body} maxLength={300} onFocus={() => (lastField.current = "body")} onChange={(e) => onChange({ body: e.target.value })} />
            </label>
            <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-[#6c6a69]">
              Insert:
              {def.tags.map((t) => (
                <button key={t.key} type="button" onClick={() => insertTag(t.key)} className="rounded-full border border-[#d9d8d6] bg-white px-2.5 py-0.5 text-[12px] text-[#1a1a19] hover:bg-[#f3f3f2]">
                  {t.label}
                </button>
              ))}
            </div>
            <TimingControls topic={def.topic} settings={settings} onChange={onTiming} />
          </div>
          <div className="flex flex-col gap-2">
            <span className={`text-[12px] ${MUTED}`}>Preview</span>
            <Preview title={fillTemplate(value.title, vars) || def.label} body={fillTemplate(value.body, vars) || null} />
            <button type="button" className={`${BTN_SECONDARY} self-start`} onClick={test} disabled={testing}>
              {testing ? "Sending…" : "Send me a test"}
            </button>
            {testMessage && (
              <p role="status" className={`text-[12px] ${MUTED}`}>
                {testMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export function NotificationsEditor({ initial }: { initial: NotificationSettings }) {
  const [settings, setSettings] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [saving, startSave] = useTransition();
  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);

  function patchTopic(topic: Topic, patch: Partial<TopicSettings>) {
    setSettings((s) => ({ ...s, topics: { ...s.topics, [topic]: { ...s.topics[topic], ...patch } } }));
  }

  function save() {
    setNotice(null);
    const parsed = notificationSettingsSchema.safeParse(settings);
    if (!parsed.success) return setNotice({ tone: "error", text: parsed.error.issues[0]?.message ?? "Check the settings." });
    startSave(async () => {
      const res = await saveMemberNotificationSettings(settings);
      if (!res.ok) return setNotice({ tone: "error", text: res.error });
      setSaved(settings);
      setNotice({ tone: "success", text: "Saved. The next notifications use these settings." });
    });
  }

  return (
    <div className="space-y-4 pb-20">
      {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
      <ul className="space-y-3">
        {TOPIC_DEFS.map((def) => (
          <TopicCard key={def.topic} def={def} value={settings.topics[def.topic]} settings={settings} onChange={(patch) => patchTopic(def.topic, patch)} onTiming={setSettings} />
        ))}
      </ul>
      <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-[12px] border border-[#e7e6e4] bg-white/95 px-4 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
        <span className={`mr-auto text-[13px] ${MUTED}`}>{dirty ? "You have unsaved changes." : "All changes saved."}</span>
        {dirty && (
          <button type="button" className={BTN_SECONDARY} onClick={() => setSettings(saved)} disabled={saving}>
            Discard
          </button>
        )}
        <button type="button" className={BTN_PRIMARY} onClick={save} disabled={!dirty || saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
