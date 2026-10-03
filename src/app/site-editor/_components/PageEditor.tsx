"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PageDoc, PageSeo } from "@/lib/site/page-doc";
import { newSection } from "@/lib/site/page-doc";
import { SECTION_DEFS } from "@/lib/site/registry";
import type { SectionDef } from "@/lib/site/section-def";
import { BTN_PRIMARY, BTN_SECONDARY } from "@/app/admin/_components/ui";
import { discardSiteDraft, hideSitePage, publishSitePage, restoreSiteVersion, saveSiteDraft, type EditorResult } from "../actions";
import { FieldsForm } from "./fields";
import { AddSectionPicker, HistoryPanel, PageSettingsPanel, SectionList } from "./panels";
import { EditorShell, PanelHeader, PreviewFrame, type Device, type PreviewHandle } from "./shell";
import { useAutosave } from "./use-autosave";

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

type Panel = { kind: "list" } | { kind: "section"; id: string } | { kind: "add" } | { kind: "page" } | { kind: "history" };

const STATUS_LABEL = { draft: "Not published yet", published: "Live", hidden: "Off the site" } as const;

/** Website → edit a page: sections on the left, the draft live on the right; changes save themselves. */
export function PageEditor({ page, siteUrl }: { page: EditorPage; siteUrl: string }) {
  const [draft, setDraft] = useState<Draft>({ title: page.title, slug: page.slug, seo: page.seo, doc: page.doc });
  const [panel, setPanel] = useState<Panel>({ kind: "list" });
  const [device, setDevice] = useState<Device>("desktop");
  const [status, setStatus] = useState(page.status);
  const [hasChanges, setHasChanges] = useState(page.hasChanges);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const preview = useRef<PreviewHandle>(null);

  const save = useCallback((rev: number, d: Draft) => saveSiteDraft({ id: page.id, rev, title: d.title, slug: d.slug, seo: d.seo, doc: d.doc }), [page.id]);
  const onSaved = useCallback(() => {
    setHasChanges(true);
    preview.current?.refresh();
  }, []);
  const autosave = useAutosave(draft, page.rev, save, onSaved);

  const selectedId = panel.kind === "section" ? panel.id : null;
  useEffect(() => {
    preview.current?.focus(selectedId);
  }, [selectedId]);

  const setSections = (sections: PageDoc["sections"]) => setDraft((d) => ({ ...d, doc: { ...d.doc, sections } }));

  function addSection(def: SectionDef) {
    const s = newSection(def, new Set(draft.doc.sections.map((x) => x.id)));
    setSections([...draft.doc.sections, s]);
    setPanel({ kind: "section", id: s.id });
  }

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

  const section = selectedId ? draft.doc.sections.find((s) => s.id === selectedId) : undefined;
  const def = section ? SECTION_DEFS[section.type] : undefined;
  const livePath = draft.slug ? `/${draft.slug}` : "/";

  const panelContent =
    panel.kind === "add" ? (
      <AddSectionPicker onPick={addSection} onBack={() => setPanel({ kind: "list" })} />
    ) : panel.kind === "page" ? (
      <PageSettingsPanel
        value={{ title: draft.title, slug: draft.slug, seo: draft.seo, assistant: draft.doc.assistant }}
        onChange={(v) => setDraft((d) => ({ ...d, title: v.title, slug: v.slug, seo: v.seo, doc: { ...d.doc, assistant: v.assistant } }))}
        isSystem={page.isSystem}
        siteUrl={siteUrl}
        onBack={() => setPanel({ kind: "list" })}
      />
    ) : panel.kind === "history" ? (
      <HistoryPanel pageId={page.id} onBack={() => setPanel({ kind: "list" })} onRestore={(v) => run(() => restoreSiteVersion(page.id, v), reloadFromServer)} />
    ) : section && def ? (
      <div>
        <PanelHeader title={def.label} onBack={() => setPanel({ kind: "list" })} />
        <div className="space-y-4 p-3">
          <FieldsForm
            fields={def.fields}
            values={section.settings}
            idPrefix={section.id}
            onChange={(settings) => setSections(draft.doc.sections.map((s) => (s.id === section.id ? { ...s, settings } : s)))}
          />
        </div>
      </div>
    ) : (
      <SectionList
        sections={draft.doc.sections}
        selected={selectedId}
        onSelect={(id) => setPanel({ kind: "section", id })}
        onChange={setSections}
        onAdd={() => setPanel({ kind: "add" })}
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
      preview={<PreviewFrame ref={preview} src={`/site-preview/${page.id}`} device={device} onSelect={(id) => setPanel({ kind: "section", id })} />}
      actions={
        <>
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
