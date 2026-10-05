"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { COLOR_LABELS, contrastRatio, DEFAULT_THEME, FONT_OPTIONS, type FontName, type NavLink, type SiteTheme, type ThemeColors } from "@/lib/site/theme";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT } from "@/app/admin/_components/ui";
import { publishTheme, saveThemeDraft } from "../actions";
import { FieldsForm } from "./fields";
import { EditorShell, PanelHeader, PreviewFrame, type Device, type PreviewHandle } from "./shell";
import { useAutosave } from "./use-autosave";

const COLOR_KEYS = Object.keys(COLOR_LABELS) as (keyof ThemeColors)[];
const MIN_CONTRAST = 4.5;

function ColorRow({ k, value, onChange }: { k: keyof ThemeColors; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value);
  if (text !== value && /^#[0-9a-f]{6}$/i.test(text) === false && text.length === 7) setText(value);
  return (
    <div className="flex items-start gap-2">
      <input type="color" value={value} onChange={(e) => (setText(e.target.value), onChange(e.target.value))} className="mt-0.5 h-8 w-10 shrink-0 cursor-pointer rounded border border-[#d9d8d6] bg-white" aria-label={COLOR_LABELS[k].label} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium">{COLOR_LABELS[k].label}</span>
          <input
            className="w-24 rounded-[6px] border border-[#d9d8d6] px-2 py-0.5 font-mono text-[12px]"
            value={text}
            maxLength={7}
            onChange={(e) => {
              setText(e.target.value);
              if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value.toLowerCase());
            }}
            aria-label={`${COLOR_LABELS[k].label} hex code`}
          />
        </div>
        <p className="text-[12px] text-[#6c6a69]">{COLOR_LABELS[k].help}</p>
      </div>
    </div>
  );
}

const LINKS_FIELD = (label: string, max: number) =>
  ({
    kind: "list",
    key: "links",
    label,
    itemLabel: "Link",
    max,
    titleKey: "label",
    fields: [{ kind: "link", key: "link", label: "Link" }],
  }) as const;

const toItems = (links: NavLink[]) => links.map((l) => ({ link: { label: l.label, href: l.href } }));
const fromItems = (items: unknown): NavLink[] =>
  Array.isArray(items) ? items.map((i) => (i as { link: NavLink }).link).map((l) => ({ label: l?.label ?? "", href: l?.href ?? "" })) : [];

/** Website → Theme: colors, fonts, logo, header and footer, previewed on the home page. */
export function ThemeEditor({ initial, rev, previewPageId, hasChanges: initialChanges }: { initial: SiteTheme; rev: number; previewPageId: string; hasChanges: boolean }) {
  const [theme, setTheme] = useState(initial);
  const [device, setDevice] = useState<Device>("desktop");
  const [hasChanges, setHasChanges] = useState(initialChanges);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const preview = useRef<PreviewHandle>(null);
  const save = useCallback((r: number, t: SiteTheme) => saveThemeDraft(r, t), []);
  const onSaved = useCallback(() => {
    setHasChanges(true);
    preview.current?.refresh();
  }, []);
  const autosave = useAutosave(theme, rev, save, onSaved);

  const setColor = (k: keyof ThemeColors, v: string) => setTheme((t) => ({ ...t, colors: { ...t.colors, [k]: v } }));
  const lowContrast = contrastRatio(theme.colors.primary, "#ffffff") < MIN_CONTRAST || contrastRatio(theme.colors.text, theme.colors.background) < MIN_CONTRAST;

  async function publish() {
    setBusy(true);
    if (!(await autosave.flush())) {
      setBusy(false);
      return;
    }
    const result = await publishTheme().catch(() => ({ ok: false as const, error: "That didn't go through. Try again." }));
    setBusy(false);
    if (!result.ok) return setMessage({ tone: "error", text: result.error });
    setHasChanges(false);
    setMessage({ tone: "ok", text: result.message ?? "Published." });
  }

  const panel = (
    <div>
      <PanelHeader title="Theme" />
      <div className="space-y-6 p-3">
        <section className="space-y-3">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[#9b9997]">Colors</h3>
          {COLOR_KEYS.map((k) => (
            <ColorRow key={k} k={k} value={theme.colors[k]} onChange={(v) => setColor(k, v)} />
          ))}
          {lowContrast && <p className="rounded-[8px] bg-[#fdf1dc] p-2 text-[12px] text-[#8a5a00]">Some text may be hard to read: make the brand color darker, or the text and background further apart.</p>}
          <button type="button" className="text-[12px] font-medium underline" onClick={() => setTheme((t) => ({ ...t, colors: DEFAULT_THEME.colors }))}>
            Back to the original colors
          </button>
        </section>
        <section className="space-y-3">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[#9b9997]">Fonts</h3>
          {(["headingFont", "bodyFont"] as const).map((k) => (
            <label key={k} className="block text-[13px]">
              <span className="mb-1 block font-medium">{k === "headingFont" ? "Headings" : "Body text"}</span>
              <select className={INPUT} value={theme[k]} onChange={(e) => setTheme((t) => ({ ...t, [k]: e.target.value as FontName }))}>
                {FONT_OPTIONS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </section>
        <section className="space-y-3">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[#9b9997]">Logo</h3>
          <FieldsForm
            fields={[{ kind: "image", key: "logo", label: "Logo", help: "A PNG with a transparent background looks best." }]}
            values={{ logo: { src: theme.logo, alt: "BONDED Logo" } }}
            idPrefix="theme"
            onChange={(v) => {
              const src = (v.logo as { src: string }).src;
              setTheme((t) => ({ ...t, logo: src || DEFAULT_THEME.logo }));
            }}
          />
        </section>
        <section className="space-y-3">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[#9b9997]">Header</h3>
          <FieldsForm
            fields={[LINKS_FIELD("Menu links", 6), { kind: "link", key: "button", label: "Button" }]}
            values={{ links: toItems(theme.header.links), button: theme.header.button }}
            idPrefix="header"
            onChange={(v) => setTheme((t) => ({ ...t, header: { links: fromItems(v.links), button: v.button as NavLink } }))}
          />
        </section>
        <section className="space-y-3">
          <h3 className="text-[12px] font-semibold uppercase tracking-wide text-[#9b9997]">Footer</h3>
          <FieldsForm
            fields={[{ kind: "textarea", key: "tagline", label: "Text under the logo", rows: 3, max: 400, help: " " }, LINKS_FIELD("Explore links", 8)]}
            values={{ tagline: theme.footer.tagline, links: toItems(theme.footer.links) }}
            idPrefix="footer"
            onChange={(v) => setTheme((t) => ({ ...t, footer: { tagline: String(v.tagline ?? ""), links: fromItems(v.links) } }))}
          />
          <p className="text-[12px] text-[#6c6a69]">The contact email and social links come from Settings → General.</p>
        </section>
      </div>
    </div>
  );

  const notice =
    autosave.error || message ? (
      <div className={`border-b px-4 py-2 text-[13px] ${autosave.error || message?.tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`} role="status">
        {autosave.error ?? message?.text}
      </div>
    ) : null;

  return (
    <EditorShell
      title="Theme, header and footer"
      status={autosave.status}
      device={device}
      onDevice={setDevice}
      notice={notice}
      panel={panel}
      preview={<PreviewFrame ref={preview} src={`/site-preview/${previewPageId}`} device={device} />}
      actions={
        <>
          <Link href="/admin/website" className={`${BTN_SECONDARY} max-sm:hidden`}>
            Pages
          </Link>
          <button type="button" className={BTN_PRIMARY} disabled={busy || (!hasChanges && autosave.status === "saved")} onClick={publish}>
            {busy ? "Publishing…" : "Publish theme"}
          </button>
        </>
      }
    />
  );
}
