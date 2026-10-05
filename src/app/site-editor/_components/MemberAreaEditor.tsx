"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import {
  BANNER_AUDIENCES,
  BANNER_TONES,
  HOME_SECTIONS,
  MEMBER_COLOR_LABELS,
  RADIUS_OPTIONS,
  type MemberAreaSettings,
  type MemberBanner,
  type MemberColors,
  type MenuItem,
} from "@/lib/member-area/settings";
import { FONT_OPTIONS, type FontName } from "@/lib/site/theme";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT } from "@/app/admin/_components/ui";
import { publishMemberArea, saveMemberAreaDraft, type EditorResult } from "../actions";
import { ImageLibrary } from "./ImageLibrary";
import { EditorShell, PanelHeader, PreviewFrame, type Device, type PreviewHandle } from "./shell";
import { useAutosave } from "./use-autosave";
import { useHistory } from "./use-history";

type Tab = "look" | "home" | "banners" | "menu";

const TABS: { key: Tab; label: string }[] = [
  { key: "look", label: "Look" },
  { key: "home", label: "Home" },
  { key: "banners", label: "Banners" },
  { key: "menu", label: "Menu" },
];

const PAGES = [
  { to: "/home", label: "Home" },
  { to: "/my-courses", label: "My Chapters" },
  { to: "/practice", label: "Practice" },
  { to: "/moves", label: "Moves Library" },
  { to: "/feedback", label: "Feedback" },
  { to: "/progress", label: "Progress" },
  { to: "/community", label: "Community" },
  { to: "/settings", label: "Settings" },
];

const ICON_BTN = "flex h-7 w-7 items-center justify-center rounded-[6px] text-[#6c6a69] hover:bg-[#efeeed] hover:text-[#1a1a19] disabled:opacity-30";
const H = "text-[12px] font-semibold uppercase tracking-wide text-[#9b9997]";

function move<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

// ---------- Look ----------

function ColorInput({ label, help, value, onChange }: { label: string; help: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-start gap-2">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="mt-0.5 h-8 w-10 shrink-0 cursor-pointer rounded border border-[#d9d8d6]" aria-label={label} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium">{label}</span>
          <input
            key={value}
            className="w-24 rounded-[6px] border border-[#d9d8d6] px-2 py-0.5 font-mono text-[12px]"
            defaultValue={value}
            maxLength={7}
            onBlur={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && onChange(e.target.value.toLowerCase())}
            aria-label={`${label} hex code`}
          />
        </div>
        <p className="text-[12px] text-[#6c6a69]">{help}</p>
      </div>
    </div>
  );
}

function LookTab({ value, onChange }: { value: MemberAreaSettings["look"]; onChange: (v: MemberAreaSettings["look"]) => void }) {
  const [library, setLibrary] = useState(false);
  return (
    <div className="space-y-6">
      <label className="flex items-start gap-2 rounded-[8px] border border-[#e7e6e4] bg-[#fafaf9] p-3 text-[13px]">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#343332]" checked={value.followSite} onChange={(e) => onChange({ ...value, followSite: e.target.checked })} />
        <span>
          <span className="block font-medium">Use the website&apos;s colors and fonts</span>
          <span className="block text-[12px] text-[#6c6a69]">Change them once in Website → Theme and both follow. Untick to give the member area its own.</span>
        </span>
      </label>
      {!value.followSite && (
        <>
          <section className="space-y-3">
            <h3 className={H}>Colors</h3>
            {(Object.keys(MEMBER_COLOR_LABELS) as (keyof MemberColors)[]).map((k) => (
              <ColorInput key={k} label={MEMBER_COLOR_LABELS[k].label} help={MEMBER_COLOR_LABELS[k].help} value={value.colors[k]} onChange={(v) => onChange({ ...value, colors: { ...value.colors, [k]: v } })} />
            ))}
          </section>
          <section className="space-y-3">
            <h3 className={H}>Fonts</h3>
            {(["headingFont", "bodyFont"] as const).map((k) => (
              <label key={k} className="block text-[13px]">
                <span className="mb-1 block font-medium">{k === "headingFont" ? "Headings" : "Body text"}</span>
                <select className={INPUT} value={value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.value as FontName })}>
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </section>
        </>
      )}
      <section className="space-y-2">
        <h3 className={H}>Corners</h3>
        <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Corners">
          {RADIUS_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={value.radius === o.value}
              onClick={() => onChange({ ...value, radius: o.value })}
              className={`rounded-full px-3 py-1 text-[12px] ${value.radius === o.value ? "bg-[#343332] text-white" : "border border-[#d9d8d6] hover:bg-[#f3f3f2]"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>
      <section className="space-y-2">
        <h3 className={H}>Logo</h3>
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- the chosen logo */}
          <img src={value.logo} alt="" className="h-10 max-w-[140px] rounded border border-[#e7e6e4] bg-white object-contain p-1" />
          <button type="button" className="rounded-full border border-[#d9d8d6] px-3 py-1 text-[12px] font-medium hover:bg-[#f3f3f2]" onClick={() => setLibrary(true)}>
            Change
          </button>
          {value.logo !== "/app/img/logo.png" && (
            <button type="button" className="text-[12px] text-[#a4262c] hover:underline" onClick={() => onChange({ ...value, logo: "/app/img/logo.png" })}>
              Back to the original
            </button>
          )}
        </div>
      </section>
      {library && (
        <ImageLibrary
          onClose={() => setLibrary(false)}
          onPick={(src) => {
            onChange({ ...value, logo: src });
            setLibrary(false);
          }}
        />
      )}
    </div>
  );
}

// ---------- Home ----------

function HomeTab({ value, onChange }: { value: MemberAreaSettings["home"]; onChange: (v: MemberAreaSettings["home"]) => void }) {
  return (
    <div className="space-y-6">
      <section className="space-y-3 text-[13px]">
        <h3 className={H}>Welcome</h3>
        <label className="block">
          <span className="mb-1 block font-medium">For returning members</span>
          <input className={INPUT} value={value.welcomeBack} maxLength={60} onChange={(e) => onChange({ ...value, welcomeBack: e.target.value })} />
          <span className="mt-1 block text-[12px] text-[#6c6a69]">Shown above the member&apos;s and dog&apos;s names.</span>
        </label>
        <label className="block">
          <span className="mb-1 block font-medium">For new members</span>
          <input className={INPUT} value={value.welcomeNew} maxLength={60} onChange={(e) => onChange({ ...value, welcomeNew: e.target.value })} />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium">Text for members without a chapter yet</span>
          <textarea className={INPUT} rows={3} value={value.noChapterText} maxLength={400} onChange={(e) => onChange({ ...value, noChapterText: e.target.value })} />
        </label>
      </section>
      <section className="space-y-2">
        <h3 className={H}>Under the welcome</h3>
        <p className="text-[12px] text-[#6c6a69]">The welcome with the next lesson always comes first. Order and show or hide the rest.</p>
        <ul className="divide-y divide-[#efeeed] rounded-[8px] border border-[#e7e6e4]">
          {value.sections.map((s, i) => {
            const info = HOME_SECTIONS.find((h) => h.key === s.key);
            return (
              <li key={s.key} className="flex items-start gap-1 px-2 py-2">
                <span className={`min-w-0 flex-1 text-[13px] ${s.visible ? "" : "text-[#9b9997] line-through"}`}>
                  <span className="block font-medium">{info?.label}</span>
                  <span className="block text-[12px] text-[#6c6a69]">{info?.description}</span>
                </span>
                <button type="button" className={ICON_BTN} disabled={i === 0} onClick={() => onChange({ ...value, sections: move(value.sections, i, i - 1) })} aria-label="Move up">
                  <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                </button>
                <button type="button" className={ICON_BTN} disabled={i === value.sections.length - 1} onClick={() => onChange({ ...value, sections: move(value.sections, i, i + 1) })} aria-label="Move down">
                  <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                </button>
                <button type="button" className={ICON_BTN} onClick={() => onChange({ ...value, sections: value.sections.map((x, j) => (j === i ? { ...x, visible: !x.visible } : x)) })} aria-label={s.visible ? "Hide" : "Show"}>
                  <span className="material-symbols-outlined text-[18px]">{s.visible ? "visibility" : "visibility_off"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

// ---------- Banners ----------

function newBanner(taken: string[]): MemberBanner {
  let n = 1;
  while (taken.includes(`banner-${n}`)) n++;
  return { id: `banner-${n}`, text: "Live Q&A with Roni this Thursday at 19:00!", link: { label: "Details", href: "/community" }, tone: "gold", audience: "all", starts: "", ends: "", dismissible: true };
}

function BannersTab({ value, onChange }: { value: MemberBanner[]; onChange: (v: MemberBanner[]) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const set = (i: number, patch: Partial<MemberBanner>) => onChange(value.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-[#6c6a69]">Banners show at the top of every member page, between their dates, to the members you pick.</p>
      <ul className="space-y-2">
        {value.map((b, i) => (
          <li key={b.id} className="rounded-[8px] border border-[#e7e6e4] bg-white">
            <div className="flex items-center gap-1 px-2 py-1.5">
              <button type="button" className="min-w-0 flex-1 truncate py-1 text-left text-[13px] hover:underline" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                {b.text || "Banner"}
              </button>
              <button type="button" className={ICON_BTN} onClick={() => (onChange(value.filter((_, j) => j !== i)), setOpen(null))} aria-label="Remove banner">
                <span className="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
            {open === i && (
              <div className="space-y-3 border-t border-[#efeeed] bg-[#fafaf9] p-3 text-[13px]">
                <label className="block">
                  <span className="mb-1 block font-medium">Text</span>
                  <textarea className={INPUT} rows={2} maxLength={240} value={b.text} onChange={(e) => set(i, { text: e.target.value })} />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block font-medium">Link text</span>
                    <input className={INPUT} maxLength={40} value={b.link.label} placeholder="Optional" onChange={(e) => set(i, { link: { ...b.link, label: e.target.value } })} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block font-medium">Link</span>
                    <input className={INPUT} maxLength={500} value={b.link.href} placeholder="/community or https://…" onChange={(e) => set(i, { link: { ...b.link, href: e.target.value } })} />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block font-medium">Color</span>
                    <select className={INPUT} value={b.tone} onChange={(e) => set(i, { tone: e.target.value as MemberBanner["tone"] })}>
                      {BANNER_TONES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block font-medium">Show to</span>
                    <select className={INPUT} value={b.audience} onChange={(e) => set(i, { audience: e.target.value as MemberBanner["audience"] })}>
                      {BANNER_AUDIENCES.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block font-medium">From</span>
                    <input type="date" className={INPUT} value={b.starts} onChange={(e) => set(i, { starts: e.target.value })} />
                  </label>
                  <label className="block">
                    <span className="mb-1 block font-medium">Until (last day)</span>
                    <input type="date" className={INPUT} value={b.ends} onChange={(e) => set(i, { ends: e.target.value })} />
                  </label>
                </div>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4 accent-[#343332]" checked={b.dismissible} onChange={(e) => set(i, { dismissible: e.target.checked })} />
                  Members can close it
                </label>
              </div>
            )}
          </li>
        ))}
      </ul>
      {value.length < 10 && (
        <button
          type="button"
          className="flex items-center gap-1 text-[13px] font-medium text-[#1d4f91] hover:underline"
          onClick={() => {
            onChange([...value, newBanner(value.map((b) => b.id))]);
            setOpen(value.length);
          }}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>Add banner
        </button>
      )}
    </div>
  );
}

// ---------- Menu ----------

function MenuTab({ value, onChange }: { value: MenuItem[]; onChange: (v: MenuItem[]) => void }) {
  const set = (i: number, patch: Partial<MenuItem>) => onChange(value.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-[#6c6a69]">Rename, reorder or hide menu items, and add your own links (like the WhatsApp group). The phone tab bar shows the first five of Home, My Chapters, Practice, Feedback and Progress that are visible.</p>
      <ul className="space-y-2">
        {value.map((m, i) => (
          <li key={`${m.href}-${i}`} className={`rounded-[8px] border border-[#e7e6e4] bg-white p-2 ${m.visible ? "" : "opacity-60"}`}>
            <div className="flex items-center gap-1">
              <span className="material-symbols-outlined w-6 text-[18px] text-[#6c6a69]">{m.icon}</span>
              <input className={`${INPUT} flex-1 py-1 text-[13px]`} value={m.label} maxLength={30} onChange={(e) => set(i, { label: e.target.value })} aria-label="Menu name" />
              <button type="button" className={ICON_BTN} disabled={i === 0} onClick={() => onChange(move(value, i, i - 1))} aria-label="Move up">
                <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
              </button>
              <button type="button" className={ICON_BTN} disabled={i === value.length - 1} onClick={() => onChange(move(value, i, i + 1))} aria-label="Move down">
                <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
              </button>
              <button type="button" className={ICON_BTN} disabled={m.href === "/home"} onClick={() => set(i, { visible: !m.visible })} aria-label={m.visible ? "Hide" : "Show"} title={m.href === "/home" ? "Home always stays" : undefined}>
                <span className="material-symbols-outlined text-[18px]">{m.visible ? "visibility" : "visibility_off"}</span>
              </button>
              {m.custom && (
                <button type="button" className={ICON_BTN} onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove link">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              )}
            </div>
            <div className="mt-1.5 flex items-center gap-2 pl-7 text-[12px] text-[#6c6a69]">
              <input className={`${INPUT} w-28 py-0.5 text-[12px]`} value={m.icon} maxLength={40} onChange={(e) => set(i, { icon: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })} aria-label="Icon" />
              {m.custom ? (
                <input className={`${INPUT} flex-1 py-0.5 text-[12px]`} value={m.href} maxLength={500} onChange={(e) => set(i, { href: e.target.value })} aria-label="Link" placeholder="https://…" />
              ) : (
                <span className="truncate">{m.href}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
      {value.length < 16 && (
        <button
          type="button"
          className="flex items-center gap-1 text-[13px] font-medium text-[#1d4f91] hover:underline"
          onClick={() => onChange([...value, { href: "https://chat.whatsapp.com/", label: "WhatsApp group", icon: "forum", visible: true, custom: true }])}
        >
          <span className="material-symbols-outlined text-[18px]">add</span>Add a link
        </button>
      )}
      <p className="text-[12px] text-[#9b9997]">Icons are names from fonts.google.com/icons.</p>
    </div>
  );
}

// ---------- Editor ----------

/** Website → Member area: look, home screen, banners and menu, previewed live as a member sees it. */
export function MemberAreaEditor({ initial, rev, hasChanges: initialChanges }: { initial: MemberAreaSettings; rev: number; hasChanges: boolean }) {
  const history = useHistory(initial);
  const settings = history.value;
  const [tab, setTab] = useState<Tab>("look");
  const [page, setPage] = useState("/home");
  const [device, setDevice] = useState<Device>("desktop");
  const [hasChanges, setHasChanges] = useState(initialChanges);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const preview = useRef<PreviewHandle>(null);
  const save = useCallback((r: number, s: MemberAreaSettings) => saveMemberAreaDraft(r, s), []);
  const onSaved = useCallback(() => {
    setHasChanges(true);
    preview.current?.refresh();
  }, []);
  const autosave = useAutosave(settings, rev, save, onSaved);
  const set = <K extends keyof MemberAreaSettings>(k: K, v: MemberAreaSettings[K]) => history.set((s) => ({ ...s, [k]: v }));

  async function publish() {
    setBusy(true);
    setMessage(null);
    if (!(await autosave.flush())) return setBusy(false);
    const result = await publishMemberArea().catch((): EditorResult => ({ ok: false, error: "That didn't go through. Try again." }));
    setBusy(false);
    if (!result.ok) return setMessage({ tone: "error", text: result.error });
    setHasChanges(false);
    setMessage({ tone: "ok", text: result.message ?? "Published." });
  }

  const panel = (
    <div>
      <PanelHeader title="Member area" />
      <div className="flex border-b border-[#efeeed] px-3" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 border-b-2 py-2 text-[13px] font-medium ${tab === t.key ? "border-[#1a1a19] text-[#1a1a19]" : "border-transparent text-[#6c6a69] hover:text-[#1a1a19]"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-3">
        {tab === "look" && <LookTab value={settings.look} onChange={(v) => set("look", v)} />}
        {tab === "home" && <HomeTab value={settings.home} onChange={(v) => set("home", v)} />}
        {tab === "banners" && <BannersTab value={settings.banners} onChange={(v) => set("banners", v)} />}
        {tab === "menu" && <MenuTab value={settings.menu} onChange={(v) => set("menu", v)} />}
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
      title={
        <span className="flex items-center gap-2">
          Member area
          <select className="rounded-full border border-[#d9d8d6] bg-white px-2 py-0.5 text-[12px] font-normal" value={page} onChange={(e) => setPage(e.target.value)} aria-label="Page to preview">
            {PAGES.map((p) => (
              <option key={p.to} value={p.to}>
                Preview: {p.label}
              </option>
            ))}
          </select>
        </span>
      }
      status={autosave.status}
      device={device}
      onDevice={setDevice}
      notice={notice}
      panel={panel}
      preview={<PreviewFrame ref={preview} src={`/site-editor/member/preview?to=${encodeURIComponent(page)}`} device={device} onKey={(k) => (k === "undo" ? history.undo() : history.redo())} />}
      actions={
        <>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#f3f3f2] disabled:opacity-30" onClick={history.undo} disabled={!history.canUndo} aria-label="Undo" title="Undo (Cmd+Z)">
            <span className="material-symbols-outlined text-[20px]">undo</span>
          </button>
          <Link href="/admin/website" className={`${BTN_SECONDARY} max-sm:hidden`}>
            Pages
          </Link>
          <button type="button" className={BTN_PRIMARY} disabled={busy || (!hasChanges && autosave.status === "saved")} onClick={publish}>
            {busy ? "Publishing…" : "Publish"}
          </button>
        </>
      }
    />
  );
}
