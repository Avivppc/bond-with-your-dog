"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL, MUTED, Notice } from "../../_components/ui";
import { ACCENT_PRESETS, certificateDesignSchema, DEFAULT_CERTIFICATE_DESIGN, type CertificateDesign } from "@/lib/certificates/design";
import { saveCertificateDesign } from "./actions";

/** The preview PDF reloads this long after the last keystroke. */
const PREVIEW_DELAY_MS = 600;

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      {children}
      {hint && <span className={`text-[12px] ${MUTED}`}>{hint}</span>}
    </label>
  );
}

function Check({ checked, onChange, children }: { checked: boolean; onChange: (next: boolean) => void; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-[14px]">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#343332]" />
      {children}
    </label>
  );
}

/** The design form on the left, a live sample PDF on the right; saving applies it to every certificate. */
export function CertificateEditor({ initial }: { initial: CertificateDesign }) {
  const [design, setDesign] = useState<CertificateDesign>(initial);
  const [saved, setSaved] = useState<CertificateDesign>(initial);
  const [previewSrc, setPreviewSrc] = useState(() => `/api/admin/certificate-preview?d=${encodeURIComponent(JSON.stringify(initial))}`);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof CertificateDesign>(key: K, value: CertificateDesign[K]) => setDesign((d) => ({ ...d, [key]: value }));

  const check = certificateDesignSchema.safeParse(design);
  const problem = check.success ? null : (check.error.issues[0]?.message ?? "Check the design.");
  const dirty = JSON.stringify(design) !== JSON.stringify(saved);

  useEffect(() => {
    if (problem) return;
    const timer = setTimeout(() => setPreviewSrc(`/api/admin/certificate-preview?d=${encodeURIComponent(JSON.stringify(design))}`), PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
  }, [design, problem]);

  function save() {
    start(async () => {
      const res = await saveCertificateDesign(design);
      if (res.ok) setSaved(design);
      setStatus(res.ok ? { ok: true, text: "Saved. Every certificate now uses this design." } : { ok: false, text: res.error });
    });
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="space-y-5 rounded-[12px] border border-[#e7e6e4] bg-white p-5">
        <Field label="Title">
          <input className={INPUT} maxLength={60} value={design.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="Line above the name" hint="Leave empty to show only the name.">
          <input className={INPUT} maxLength={80} value={design.intro} onChange={(e) => set("intro", e.target.value)} />
        </Field>
        <Field label="Completion word" hint={`Reads: "Dana & Rhythm have ${design.completedText || "…"} all 26 lessons of Bonded: Foundations".`}>
          <input className={INPUT} maxLength={80} value={design.completedText} onChange={(e) => set("completedText", e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Signed by">
            <input className={INPUT} maxLength={60} value={design.signerName} onChange={(e) => set("signerName", e.target.value)} />
          </Field>
          <Field label="Signer's title">
            <input className={INPUT} maxLength={60} value={design.signerTitle} onChange={(e) => set("signerTitle", e.target.value)} />
          </Field>
        </div>
        <fieldset className="space-y-2">
          <legend className={LABEL}>Colour</legend>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENT_PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => set("accentColor", p.value)}
                aria-pressed={design.accentColor.toLowerCase() === p.value}
                title={p.label}
                className={`h-8 w-8 rounded-full border-2 ${design.accentColor.toLowerCase() === p.value ? "border-[#1a1a19]" : "border-white shadow"}`}
                style={{ background: p.value }}
              >
                <span className="sr-only">{p.label}</span>
              </button>
            ))}
            <input
              type="color"
              value={design.accentColor}
              onChange={(e) => set("accentColor", e.target.value)}
              aria-label="Custom colour"
              className="h-8 w-10 cursor-pointer rounded border border-[#d9d8d6] bg-white"
            />
          </div>
        </fieldset>
        <div className="space-y-2">
          <Check checked={design.showDogName} onChange={(v) => set("showDogName", v)}>
            Show the dog&apos;s name next to the member&apos;s
          </Check>
          <Check checked={design.showLessonCount} onChange={(v) => set("showLessonCount", v)}>
            Say how many lessons they finished
          </Check>
        </div>
        {problem && <p className="text-[14px] text-[#b42318]">{problem}</p>}
        {status && <Notice tone={status.ok ? "success" : "error"}>{status.text}</Notice>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={BTN_PRIMARY} onClick={save} disabled={pending || !dirty || Boolean(problem)}>
            {pending ? "Saving…" : "Save"}
          </button>
          <button type="button" className={BTN_SECONDARY} onClick={() => setDesign(DEFAULT_CERTIFICATE_DESIGN)} disabled={pending}>
            Reset to default
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <p className={`text-[12px] ${MUTED}`}>Preview with sample names. It updates as you type; members see it after you save.</p>
        <iframe title="Certificate preview" src={previewSrc} className="aspect-[1.414] w-full rounded-[12px] border border-[#e7e6e4] bg-white" />
      </div>
    </div>
  );
}
