"use client";

import { useEffect, useState } from "react";
import { SECTION_CATEGORIES, type SectionDef } from "@/lib/site/section-def";
import { SECTION_DEFS, SECTION_LIST } from "@/lib/site/registry";
import type { PageSeo, SectionInstance } from "@/lib/site/page-doc";
import { INPUT } from "@/app/admin/_components/ui";
import { listSiteVersions, type VersionSummary } from "../actions";
import { PanelHeader } from "./shell";

const ROW_BTN = "flex h-7 w-7 items-center justify-center rounded-[6px] text-[#6c6a69] hover:bg-[#efeeed] hover:text-[#1a1a19] disabled:opacity-30";

/** The page's sections, top to bottom, with show/hide, move, duplicate and remove. */
export function SectionList({
  sections,
  selected,
  onSelect,
  onChange,
  onAdd,
  onPageSettings,
  onHistory,
}: {
  sections: SectionInstance[];
  selected: string | null;
  onSelect: (id: string) => void;
  onChange: (next: SectionInstance[]) => void;
  onAdd: () => void;
  onPageSettings: () => void;
  onHistory: () => void;
}) {
  const move = (i: number, to: number) => {
    const next = [...sections];
    const [s] = next.splice(i, 1);
    next.splice(to, 0, s);
    onChange(next);
  };
  const duplicate = (i: number) => {
    const taken = new Set(sections.map((s) => s.id));
    let n = 2;
    while (taken.has(`${sections[i].id}-${n}`)) n++;
    const copy = { ...structuredClone(sections[i]), id: `${sections[i].id}-${n}`.slice(0, 40) };
    onChange([...sections.slice(0, i + 1), copy, ...sections.slice(i + 1)]);
  };
  return (
    <div>
      <PanelHeader title="Sections">
        <button type="button" onClick={onHistory} className={ROW_BTN} aria-label="Versions" title="Versions">
          <span className="material-symbols-outlined text-[18px]">history</span>
        </button>
        <button type="button" onClick={onPageSettings} className={ROW_BTN} aria-label="Page settings" title="Page settings">
          <span className="material-symbols-outlined text-[18px]">settings</span>
        </button>
      </PanelHeader>
      <ul className="p-2">
        <li className="flex items-center gap-2 rounded-[8px] px-2 py-2 text-[13px] text-[#9b9997]">
          <span className="material-symbols-outlined text-[18px]">web_asset</span>Header (edit in Theme)
        </li>
        {sections.map((s, i) => {
          const def = SECTION_DEFS[s.type];
          return (
            <li key={s.id} className={`group flex items-center gap-1 rounded-[8px] px-1 ${selected === s.id ? "bg-[#efeeed]" : "hover:bg-[#f8f8f8]"}`}>
              <button type="button" onClick={() => onSelect(s.id)} className={`flex min-w-0 flex-1 items-center gap-2 px-1 py-2 text-left text-[13px] ${s.hidden ? "text-[#9b9997] line-through" : ""}`}>
                <span className="material-symbols-outlined text-[18px] text-[#6c6a69]">{def?.icon ?? "help"}</span>
                <span className="truncate">{def?.label ?? s.type}</span>
              </button>
              <div className="flex opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                <button type="button" className={ROW_BTN} disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Move up">
                  <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                </button>
                <button type="button" className={ROW_BTN} disabled={i === sections.length - 1} onClick={() => move(i, i + 1)} aria-label="Move down">
                  <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                </button>
                <button type="button" className={ROW_BTN} onClick={() => onChange(sections.map((x, j) => (j === i ? { ...x, hidden: !x.hidden } : x)))} aria-label={s.hidden ? "Show section" : "Hide section"}>
                  <span className="material-symbols-outlined text-[18px]">{s.hidden ? "visibility_off" : "visibility"}</span>
                </button>
                <button type="button" className={ROW_BTN} onClick={() => duplicate(i)} aria-label="Duplicate section">
                  <span className="material-symbols-outlined text-[18px]">content_copy</span>
                </button>
                <button
                  type="button"
                  className={ROW_BTN}
                  onClick={() => window.confirm(`Remove "${def?.label ?? s.type}" from this page?`) && onChange(sections.filter((_, j) => j !== i))}
                  aria-label="Remove section"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={onAdd} className="mt-1 flex w-full items-center gap-2 rounded-[8px] px-2 py-2 text-[13px] font-medium text-[#1d4f91] hover:bg-[#e6f0fb]">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>Add section
          </button>
        </li>
        <li className="flex items-center gap-2 rounded-[8px] px-2 py-2 text-[13px] text-[#9b9997]">
          <span className="material-symbols-outlined text-[18px]">call_to_action</span>Footer (edit in Theme)
        </li>
      </ul>
    </div>
  );
}

export function AddSectionPicker({ onPick, onBack }: { onPick: (def: SectionDef) => void; onBack: () => void }) {
  const [q, setQ] = useState("");
  const match = (d: SectionDef) => !q || `${d.label} ${d.description}`.toLowerCase().includes(q.toLowerCase());
  return (
    <div>
      <PanelHeader title="Add section" onBack={onBack} />
      <div className="p-3">
        <input className={INPUT} placeholder="Search sections" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search sections" />
      </div>
      {SECTION_CATEGORIES.map((cat) => {
        const defs = SECTION_LIST.filter((d) => d.category === cat && match(d));
        if (defs.length === 0) return null;
        return (
          <div key={cat} className="px-3 pb-3">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#9b9997]">{cat}</p>
            <ul className="space-y-1">
              {defs.map((d) => (
                <li key={d.type}>
                  <button type="button" onClick={() => onPick(d)} className="flex w-full items-start gap-2 rounded-[8px] border border-[#efeeed] px-2.5 py-2 text-left hover:border-[#d9d8d6] hover:bg-[#fafaf9]">
                    <span className="material-symbols-outlined mt-0.5 text-[18px] text-[#6c6a69]">{d.icon}</span>
                    <span>
                      <span className="block text-[13px] font-medium">{d.label}</span>
                      <span className="block text-[12px] text-[#6c6a69]">{d.description}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export interface PageSettingsValue {
  title: string;
  slug: string;
  seo: PageSeo;
  assistant: boolean;
}

export function PageSettingsPanel({ value, onChange, isSystem, onBack, siteUrl }: { value: PageSettingsValue; onChange: (v: PageSettingsValue) => void; isSystem: boolean; onBack: () => void; siteUrl: string }) {
  const seo = (patch: Partial<PageSeo>) => onChange({ ...value, seo: { ...value.seo, ...patch } });
  return (
    <div>
      <PanelHeader title="Page settings" onBack={onBack} />
      <div className="space-y-4 p-3 text-[13px]">
        <label className="block">
          <span className="mb-1 block font-medium">Page name</span>
          <input className={INPUT} value={value.title} maxLength={120} onChange={(e) => onChange({ ...value, title: e.target.value })} />
        </label>
        <label className="block">
          <span className="mb-1 block font-medium">Address</span>
          <div className="flex items-center gap-1">
            <span className="text-[#6c6a69]">{siteUrl.replace(/^https?:\/\//, "")}/</span>
            <input className={INPUT} value={value.slug} maxLength={60} disabled={isSystem} onChange={(e) => onChange({ ...value, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} />
          </div>
          <span className="mt-1 block text-[12px] text-[#6c6a69]">{isSystem ? "Built-in pages keep their address." : "Changing it moves a live page to the new address right away."}</span>
        </label>
        <div className="border-t border-[#efeeed] pt-3">
          <p className="mb-2 font-semibold">Search engines and link previews</p>
          <label className="mb-3 block">
            <span className="mb-1 block font-medium">Title</span>
            <input className={INPUT} value={value.seo.title} maxLength={70} placeholder={value.title} onChange={(e) => seo({ title: e.target.value })} />
            <span className="mt-1 block text-[12px] text-[#6c6a69]">{value.seo.title.length}/70</span>
          </label>
          <label className="mb-3 block">
            <span className="mb-1 block font-medium">Description</span>
            <textarea className={INPUT} rows={3} value={value.seo.description} maxLength={170} onChange={(e) => seo({ description: e.target.value })} />
            <span className="mt-1 block text-[12px] text-[#6c6a69]">{value.seo.description.length}/170</span>
          </label>
          <label className="block">
            <span className="mb-1 block font-medium">Share image link (optional)</span>
            <input className={INPUT} value={value.seo.image} maxLength={1000} placeholder="Uses the site's default" onChange={(e) => seo({ image: e.target.value })} />
          </label>
        </div>
        <label className="flex items-start gap-2 border-t border-[#efeeed] pt-3">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#343332]" checked={value.assistant} onChange={(e) => onChange({ ...value, assistant: e.target.checked })} />
          <span>
            <span className="font-medium">Show the &quot;Ask Bonded&quot; chat button</span>
            <span className="block text-[12px] text-[#6c6a69]">Only when the AI assistant is on for sales pages.</span>
          </span>
        </label>
      </div>
    </div>
  );
}

export function HistoryPanel({ pageId, onRestore, onBack }: { pageId: string; onRestore: (versionId: string) => void; onBack: () => void }) {
  const [versions, setVersions] = useState<VersionSummary[] | null>(null);
  useEffect(() => {
    listSiteVersions(pageId).then(setVersions, () => setVersions([]));
  }, [pageId]);
  return (
    <div>
      <PanelHeader title="Published versions" onBack={onBack} />
      <div className="p-3 text-[13px]">
        {versions === null ? (
          <p className="text-[#6c6a69]">Loading…</p>
        ) : versions.length === 0 ? (
          <p className="text-[#6c6a69]">Nothing published from the editor yet. Each publish is kept here.</p>
        ) : (
          <ul className="divide-y divide-[#efeeed]">
            {versions.map((v, i) => (
              <li key={v.id} className="flex items-center justify-between gap-2 py-2">
                <span>
                  <span className="block font-medium">
                    {new Date(v.createdAt).toLocaleString()} {i === 0 && <span className="ml-1 rounded-full bg-[#e3f5e8] px-2 py-0.5 text-[11px] text-[#1c6b35]">Live</span>}
                  </span>
                  <span className="block text-[12px] text-[#6c6a69]">{v.by ? `By ${v.by}` : v.title}</span>
                </span>
                <button type="button" className="rounded-full border border-[#d9d8d6] px-3 py-1 text-[12px] font-medium hover:bg-[#f3f3f2]" onClick={() => onRestore(v.id)}>
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
