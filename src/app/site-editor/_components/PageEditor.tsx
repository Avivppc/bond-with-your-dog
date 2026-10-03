"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PageDoc, PageSeo, SectionInstance } from "@/lib/site/page-doc";
import { newSection } from "@/lib/site/page-doc";
import { SECTION_DEFS } from "@/lib/site/registry";
import type { SectionDef } from "@/lib/site/section-def";
import type { FieldValues } from "@/lib/site/fields";
import { isDefaultStyle } from "@/lib/site/section-style";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/app/admin/_components/ui";
import { discardSiteDraft, hideSitePage, publishSitePage, restoreSiteVersion, saveSiteDraft, type EditorResult } from "../actions";
import { FieldFocusContext, fieldDomId, FieldsForm } from "./fields";
import { applyTextEdit } from "@/lib/site/inline-edit";
import { AddSectionPicker, HistoryPanel, PageSettingsPanel } from "./panels";
import { duplicateSection, SectionList } from "./SectionList";
import { EditorShell, PanelHeader, PreviewFrame, type Device, type PreviewHandle } from "./shell";
import { StyleFields } from "./StyleFields";
import { useAutosave } from "./use-autosave";
import { useHistory } from "./use-history";

export interface EditorPage {
  id: string;
  title: string;
  slug: string;
  seo: PageSeo;
  doc: PageDoc;
  rev: number;
  isSystem: boolean;
  status: "draft" | "published" | "hidden";
  hasChanges: boolean;
}

interface Draft {
  title: string;
  slug: string;
  seo: PageSeo;
  doc: PageDoc;
}

type Panel =
  | { kind: "list" }
  | { kind: "section"; id: string; tab: "content" | "style"; focus?: { path: string; nonce: number } }
  | { kind: "add"; index: number }
  | { kind: "page" }
  | { kind: "history" };

const STATUS_LABEL = { draft: "Not published yet", published: "Live", hidden: "Off the site" } as const;
const ICON_BTN = "flex h-8 w-8 items-center justify-center rounded-full text-[#3d3c3a] hover:bg-[#f3f3f2] disabled:opacity-30";
const TAB = (active: boolean) => `flex-1 border-b-2 py-2 text-[13px] font-medium ${active ? "border-[#1a1a19] text-[#1a1a19]" : "border-transparent text-[#6c6a69] hover:text-[#1a1a19]"}`;

function SectionPanel({
  section,
  tab,
  focus,
  onTab,
  onChange,
  onBack,
  onDuplicate,
  onRemove,
}: {
  section: SectionInstance;
  tab: "content" | "style";
  focus?: { path: string; nonce: number };
  onTab: (t: "content" | "style") => void;
  onChange: (s: SectionInstance) => void;
  onBack: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const def = SECTION_DEFS[section.type];
  const target = focus ? fieldDomId(section.id, focus.path) : null;
  // Bring the field clicked on the page into view and flash it.
  useEffect(() => {
    if (!target) return;
    const t = setTimeout(() => {
      const el = document.getElementById(target);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.animate([{ boxShadow: "0 0 0 3px rgba(37,99,235,.6)" }, { boxShadow: "0 0 0 3px rgba(37,99,235,0)" }], { duration: 1600 });
    }, 50);
    return () => clearTimeout(t);
  }, [target, focus?.nonce]);
  if (!def) return null;
  return (
    <FieldFocusContext.Provider value={{ target, nonce: focus?.nonce ?? 0 }}>
    <div>
      <PanelHeader title={def.label} onBack={onBack}>
        <button type="button" className={ICON_BTN} onClick={() => onChange({ ...section, hidden: !section.hidden })} aria-label={section.hidden ? "Show section" : "Hide section"} title={section.hidden ? "Show" : "Hide"}>
          <span className="material-symbols-outlined text-[18px]">{section.hidden ? "visibility_off" : "visibility"}</span>
        </button>
        <button type="button" className={ICON_BTN} onClick={onDuplicate} aria-label="Duplicate section" title="Duplicate">
          <span className="material-symbols-outlined text-[18px]">content_copy</span>
        </button>
        <button type="button" className={ICON_BTN} onClick={onRemove} aria-label="Remove section" title="Remove (Cmd+Z brings it back)">
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </PanelHeader>
      <div className="flex border-b border-[#efeeed] px-3" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "content"} className={TAB(tab === "content")} onClick={() => onTab("content")}>
          Content
        </button>
        <button type="button" role="tab" aria-selected={tab === "style"} className={TAB(tab === "style")} onClick={() => onTab("style")}>
          Style{!isDefaultStyle(section.style) && <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[#2563eb] align-middle" aria-label="changed" />}
        </button>
      </div>
      <div className="space-y-4 p-3">
        {section.hidden && <p className="rounded-[8px] bg-[#fdf1dc] px-3 py-2 text-[12px] text-[#8a5a00]">This section is hidden. Visitors don&apos;t see it.</p>}
        {tab === "content" ? (
          <FieldsForm fields={def.fields} values={section.settings} idPrefix={section.id} onChange={(settings) => onChange({ ...section, settings })} />
        ) : (
          <StyleFields value={section.style} onChange={(style) => onChange({ ...section, style })} />
        )}
      </div>
    </div>
    </FieldFocusContext.Provider>
  );
}

/** Website → edit a page: sections on the left, the draft live on the right; changes save themselves. */
export function PageEditor({ page, siteUrl }: { page: EditorPage; siteUrl: string }) {
  const history = useHistory<Draft>({ title: page.title, slug: page.slug, seo: page.seo, doc: page.doc });
  const draft = history.value;
  const setDraft = history.set;
  const [panel, setPanel] = useState<Panel>({ kind: "list" });
  const [device, setDevice] = useState<Device>("desktop");
  const [status, setStatus] = useState(page.status);
  const [hasChanges, setHasChanges] = useState(page.hasChanges);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const preview = useRef<PreviewHandle>(null);

  const save = useCallback((rev: number, d: Draft) => saveSiteDraft({ id: page.id, rev, title: d.title, slug: d.slug, seo: d.seo, doc: d.doc }), [page.id]);
  // While text is typed on the page the preview isn't re-rendered (it would fight the typing);
  // when typing stops it reloads once.
  const typingOnPage = useRef(false);
  const onSaved = useCallback(() => {
    setHasChanges(true);
    if (!typingOnPage.current) preview.current?.refresh();
  }, []);
  const autosave = useAutosave(draft, page.rev, save, onSaved);

  const selectedId = panel.kind === "section" ? panel.id : null;
  // A section clicked in the preview is already in view; one picked from the list gets scrolled to.
  const pickedInPreview = useRef(false);
  useEffect(() => {
    preview.current?.focus(selectedId, !pickedInPreview.current);
    pickedInPreview.current = false;
  }, [selectedId]);

  // When undo removes the open section, the list shows instead (see panelContent).
  const section = selectedId ? draft.doc.sections.find((s) => s.id === selectedId) : undefined;

  const setSections = (update: (sections: SectionInstance[]) => SectionInstance[]) => setDraft((d) => ({ ...d, doc: { ...d.doc, sections: update(d.doc.sections) } }));

  function addSection(def: SectionDef, index: number, settings?: FieldValues) {
    const fresh = newSection(def, new Set(draft.doc.sections.map((x) => x.id)));
    const s = settings ? { ...fresh, settings } : fresh;
    setSections((list) => [...list.slice(0, index), s, ...list.slice(index)]);
    setPanel({ kind: "section", id: s.id, tab: "content" });
  }

  const selectSection = useCallback((id: string) => setPanel({ kind: "section", id, tab: "content" }), []);
  const selectFromPreview = useCallback((id: string) => {
    pickedInPreview.current = true;
    setPanel({ kind: "section", id, tab: "content" });
  }, []);
  const insertAt = useCallback((index: number) => setPanel({ kind: "add", index }), []);
  const onPreviewKey = useCallback((key: "undo" | "redo") => (key === "undo" ? history.undo() : history.redo()), [history]);
  const focusNonce = useRef(0);
  const onFocusField = useCallback((id: string, path: string) => {
    pickedInPreview.current = true;
    focusNonce.current += 1;
    setPanel({ kind: "section", id, tab: "content", focus: { path, nonce: focusNonce.current } });
  }, []);
  const onInlineEdit = (id: string, path: string, value: string) => {
    typingOnPage.current = true;
    if (panel.kind !== "section" || panel.id !== id) onFocusField(id, path);
    setSections((list) => list.map((s) => (s.id === id ? { ...s, settings: applyTextEdit(s.settings, path, value) } : s)));
  };
  const onInlineEnd = async () => {
    await autosave.flush();
    typingOnPage.current = false;
    preview.current?.reload();
  };

  async function run(action: () => Promise<EditorResult>, after?: (rev?: number) => void) {
    setBusy(true);
    setMessage(null);
    // Never publish (or restore over) something the editor isn't showing.
    if (!(await autosave.flush())) {
      setBusy(false);
      return;
    }
    const result = await action().catch((): EditorResult => ({ ok: false, error: "That didn't go through. Try again." }));
    setBusy(false);
    if (!result.ok) return setMessage({ tone: "error", text: result.error });
    if (result.message) setMessage({ tone: "ok", text: result.message });
    after?.(result.rev);
  }

  const publish = () =>
    run(
      () => publishSitePage(page.id),
      () => {
        setStatus("published");
        setHasChanges(false);
      },
    );

  const reloadFromServer = (rev?: number) => {
    // A restore or discard replaced the draft on the server: start over from a fresh copy.
    if (rev) window.location.reload();
  };

  const livePath = draft.slug ? `/${draft.slug}` : "/";
  const toList = () => setPanel({ kind: "list" });

  const panelContent =
    panel.kind === "add" ? (
      <AddSectionPicker onPick={(def, settings) => addSection(def, panel.index, settings)} onBack={toList} />
    ) : panel.kind === "page" ? (
      <PageSettingsPanel
        value={{ title: draft.title, slug: draft.slug, seo: draft.seo, assistant: draft.doc.assistant }}
        onChange={(v) => setDraft((d) => ({ ...d, title: v.title, slug: v.slug, seo: v.seo, doc: { ...d.doc, assistant: v.assistant } }))}
        isSystem={page.isSystem}
        siteUrl={siteUrl}
        onBack={toList}
      />
    ) : panel.kind === "history" ? (
      <HistoryPanel pageId={page.id} onBack={toList} onRestore={(v) => run(() => restoreSiteVersion(page.id, v), reloadFromServer)} />
    ) : panel.kind === "section" && section ? (
      <SectionPanel
        section={section}
        tab={panel.tab}
        focus={panel.focus}
        onTab={(tab) => setPanel({ ...panel, tab })}
        onChange={(next) => setSections((list) => list.map((s) => (s.id === next.id ? next : s)))}
        onBack={toList}
        onDuplicate={() => setSections((list) => duplicateSection(list, list.findIndex((s) => s.id === section.id)))}
        onRemove={() => {
          setSections((list) => list.filter((s) => s.id !== section.id));
          toList();
        }}
      />
    ) : (
      <SectionList
        sections={draft.doc.sections}
        selected={selectedId}
        onSelect={selectSection}
        onChange={(next) => setSections(() => next)}
        onAdd={insertAt}
        onPageSettings={() => setPanel({ kind: "page" })}
        onHistory={() => setPanel({ kind: "history" })}
      />
    );

  const notice =
    autosave.error || message ? (
      <div className={`border-b px-4 py-2 text-[13px] ${autosave.error || message?.tone === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`} role="status">
        {autosave.error ?? message?.text}
        {autosave.status === "conflict" && (
          <button type="button" className="ml-2 font-semibold underline" onClick={() => window.location.reload()}>
            Reload
          </button>
        )}
      </div>
    ) : null;

  return (
    <EditorShell
      title={
        <span>
          {draft.title} <span className="ml-1 text-[12px] font-normal text-[#6c6a69]">· {STATUS_LABEL[status]}</span>
        </span>
      }
      status={autosave.status}
      device={device}
      onDevice={setDevice}
      notice={notice}
      panel={panelContent}
      preview={<PreviewFrame ref={preview} src={`/site-preview/${page.id}`} device={device} onSelect={selectFromPreview} onInsert={insertAt} onKey={onPreviewKey} onEdit={onInlineEdit} onEditEnd={onInlineEnd} onFocusField={onFocusField} />}
      actions={
        <>
          <button type="button" className={ICON_BTN} onClick={history.undo} disabled={!history.canUndo} aria-label="Undo" title="Undo (Cmd+Z)">
            <span className="material-symbols-outlined text-[20px]">undo</span>
          </button>
          <button type="button" className={`${ICON_BTN} max-sm:hidden`} onClick={history.redo} disabled={!history.canRedo} aria-label="Redo" title="Redo (Shift+Cmd+Z)">
            <span className="material-symbols-outlined text-[20px]">redo</span>
          </button>
          {status === "published" && (
            <a href={livePath} target="_blank" rel="noopener noreferrer" className={`${BTN_SECONDARY} max-sm:hidden`}>
              View live
            </a>
          )}
          {status === "published" && hasChanges && (
            <button type="button" className={`${BTN_SECONDARY} max-lg:hidden`} disabled={busy} onClick={() => window.confirm("Throw away your changes and go back to the live version?") && run(() => discardSiteDraft(page.id), reloadFromServer)}>
              Discard changes
            </button>
          )}
          {!page.isSystem && status === "published" && (
            <button type="button" className={`${BTN_SECONDARY} max-lg:hidden`} disabled={busy} onClick={() => window.confirm("Take this page off the site?") && run(() => hideSitePage(page.id), () => setStatus("hidden"))}>
              Unpublish
            </button>
          )}
          <button type="button" className={BTN_PRIMARY} disabled={busy || (status === "published" && !hasChanges && autosave.status === "saved")} onClick={publish}>
            {busy ? "Working…" : status === "published" ? "Publish changes" : "Publish"}
          </button>
        </>
      }
    />
  );
}
