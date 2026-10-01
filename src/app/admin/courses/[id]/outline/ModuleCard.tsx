"use client";

import { useState, useTransition } from "react";
import type { OutlineModule } from "@/lib/course-outline";
import { createLessonInModule, createModule, deleteModule, reorderLessons, reorderModules, setOutlinePublished, updateModule } from "../outline-actions";
import { DragHandle, SortableList, type DragHandleProps } from "./SortableList";
import { LessonItem, type ModuleOption } from "./LessonItem";
import { InlineAddForm } from "./InlineAdd";
import { PublishToggle } from "./PublishToggle";
import { ModuleDetailsForm } from "./ModuleDetailsForm";
import { ActionMenu, MENU_ITEM } from "@/components/ui/ActionMenu";

/** Bumped by "Expand all / Collapse all" in the editor; every module follows the latest value. */
export interface ExpandSignal {
  open: boolean;
  version: number;
}

interface ModuleCardProps {
  courseId: string;
  module: OutlineModule;
  handle: DragHandleProps;
  moduleOptions: readonly ModuleOption[];
  expandSignal: ExpandSignal;
  onError: (message: string) => void;
}

type Adding = "lesson" | "submodule" | null;

const orderKey = (items: readonly { id: string }[]) => items.map((i) => i.id).join(",");

/**
 * A module as Kajabi shows it: a card whose header has the folder icon, title, "+ Add Content",
 * a status pill and a collapse chevron; its lessons (and submodules) are rows inside the card.
 */
export function ModuleCard({ courseId, module, handle, moduleOptions, expandSignal, onError }: ModuleCardProps) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(module.title);
  const [editingTitle, setEditingTitle] = useState(false);
  // A local toggle only counts until the next "Expand all / Collapse all".
  const [override, setOverride] = useState<ExpandSignal | null>(null);
  const open = override && override.version === expandSignal.version ? override.open : expandSignal.open;
  const setOpen = (next: boolean) => setOverride({ open: next, version: expandSignal.version });
  const [adding, setAdding] = useState<Adding>(null);
  const [editingDetails, setEditingDetails] = useState(false);
  const isTopLevel = module.parent_id === null;
  const itemCount = module.lessons.length + module.submodules.length;

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await action();
      if (!res.ok && res.error) onError(res.error);
    });
  }

  function startRename() {
    setTitle(module.title);
    setEditingTitle(true);
  }

  function publishAll(published: boolean) {
    const scope = isTopLevel ? "this module, its submodules and all their lessons" : "this submodule and all its lessons";
    if (!window.confirm(`${published ? "Publish" : "Set to draft"} ${scope}?`)) return;
    run(() => setOutlinePublished({ courseId, moduleId: module.id, published }));
  }

  function saveTitle() {
    setEditingTitle(false);
    const next = title.trim();
    if (!next || next === module.title) {
      setTitle(module.title);
      return;
    }
    run(() => updateModule({ courseId, id: module.id, title: next }));
  }

  function remove() {
    if (itemCount > 0) {
      onError(`"${module.title}" isn't empty — move or delete its lessons and submodules first.`);
      return;
    }
    if (!window.confirm(`Delete "${module.title}"?`)) return;
    run(() => deleteModule({ courseId, id: module.id }));
  }

  function startAdding(kind: Exclude<Adding, null>) {
    setAdding(kind);
    setOpen(true);
  }

  async function saveLessonOrder(ids: string[]): Promise<boolean> {
    const res = await reorderLessons({ courseId, moduleId: module.id, ids });
    if (!res.ok) onError(res.error);
    return res.ok;
  }

  async function saveSubmoduleOrder(ids: string[]): Promise<boolean> {
    const res = await reorderModules({ courseId, parentId: module.id, ids });
    if (!res.ok) onError(res.error);
    return res.ok;
  }

  const header = (
    <div className={`group flex min-h-12 items-center gap-2 py-2 pl-2 pr-3 ${isTopLevel ? "" : "bg-[#fcfcfb]"}`}>
      <span className="opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <DragHandle {...handle} label={module.title} />
      </span>
      <span className="material-symbols-outlined text-[18px] text-[#6c6a69]" aria-hidden>
        {isTopLevel ? "folder" : "folder_open"}
      </span>
      {editingTitle ? (
        <input
          autoFocus
          aria-label="Module title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              setTitle(module.title);
              setEditingTitle(false);
            }
          }}
          maxLength={200}
          className="min-w-0 flex-1 rounded-[6px] border border-[#d9d8d6] bg-white px-2 py-1 text-sm focus:border-[#343332] focus:outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          onDoubleClick={startRename}
          aria-expanded={open}
          className="min-w-0 flex-1 truncate text-left text-sm font-medium text-[#1a1a19]"
          title="Click to expand, double-click to rename"
        >
          {module.title}
          {!open && itemCount > 0 && <span className="ms-2 text-xs font-normal text-[#9b9997]">{itemCount} items</span>}
        </button>
      )}
      <ActionMenu
        label={`Add content to ${module.title}`}
        trigger={
          <>
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              add
            </span>
            Add Content
          </>
        }
        triggerClassName="hidden items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium text-[#1a1a19] hover:bg-[#efeeed] sm:inline-flex"
      >
        {(close) => (
          <>
            <button type="button" className={MENU_ITEM} onClick={() => (startAdding("lesson"), close())}>
              <span className="material-symbols-outlined text-[18px]" aria-hidden>
                videocam
              </span>
              Lesson
            </button>
            {isTopLevel && (
              <button type="button" className={MENU_ITEM} onClick={() => (startAdding("submodule"), close())}>
                <span className="material-symbols-outlined text-[18px]" aria-hidden>
                  folder_open
                </span>
                Submodule
              </button>
            )}
          </>
        )}
      </ActionMenu>
      <PublishToggle
        published={module.published}
        disabled={pending}
        label={module.title}
        onChange={(published) => run(() => updateModule({ courseId, id: module.id, published }))}
      />
      <ActionMenu
        label={`Actions for ${module.title}`}
        trigger={
          <span className="material-symbols-outlined text-[20px]" aria-hidden>
            more_horiz
          </span>
        }
        triggerClassName="flex rounded-[6px] p-0.5 text-[#9b9997] hover:bg-[#efeeed] hover:text-[#1a1a19]"
      >
        {(close) => (
          <>
            <button type="button" className={MENU_ITEM} onClick={() => (close(), startRename())}>
              Rename
            </button>
            <button type="button" className={MENU_ITEM} onClick={() => (close(), setEditingDetails(true), setOpen(true))}>
              Edit details
            </button>
            <button type="button" className={MENU_ITEM} onClick={() => (close(), publishAll(true))}>
              Publish all
            </button>
            <button type="button" className={MENU_ITEM} onClick={() => (close(), publishAll(false))}>
              Set all to draft
            </button>
            <button type="button" className={`${MENU_ITEM} sm:hidden`} onClick={() => (startAdding("lesson"), close())}>
              Add lesson
            </button>
            <button type="button" className={`${MENU_ITEM} text-red-700`} onClick={() => (close(), remove())}>
              Delete {isTopLevel ? "module" : "submodule"}
            </button>
          </>
        )}
      </ActionMenu>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={open ? `Collapse ${module.title}` : `Expand ${module.title}`}
        className="flex rounded-[6px] p-0.5 text-[#6c6a69] hover:bg-[#efeeed] hover:text-[#1a1a19]"
      >
        <span className={`material-symbols-outlined text-[20px] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          expand_more
        </span>
      </button>
    </div>
  );

  const body = open && (
    <div className="divide-y divide-[#efeeed] border-t border-[#efeeed]">
      {editingDetails ? (
        <ModuleDetailsForm
          courseId={courseId}
          moduleId={module.id}
          title={module.title}
          description={module.description ?? null}
          onDone={() => setEditingDetails(false)}
        />
      ) : (
        module.description && <p className="whitespace-pre-line px-4 py-2.5 text-xs text-[#6c6a69]">{module.description}</p>
      )}
      {module.lessons.length > 0 && (
        <SortableList
          key={orderKey(module.lessons)}
          items={module.lessons}
          onReorder={saveLessonOrder}
          className="divide-y divide-[#efeeed]"
          renderItem={(lesson, h) => <LessonItem courseId={courseId} lesson={lesson} handle={h} moduleOptions={moduleOptions} onError={onError} />}
        />
      )}

      {module.submodules.length > 0 && (
        <SortableList
          key={orderKey(module.submodules)}
          items={module.submodules}
          onReorder={saveSubmoduleOrder}
          className="divide-y divide-[#efeeed]"
          renderItem={(sub, h) => (
            <div className="pl-6">
              <ModuleCard courseId={courseId} module={sub} handle={h} moduleOptions={moduleOptions} expandSignal={expandSignal} onError={onError} />
            </div>
          )}
        />
      )}

      {itemCount === 0 && !adding && (
        <button type="button" onClick={() => startAdding("lesson")} className="w-full px-4 py-3 text-left text-sm text-[#6c6a69] hover:bg-[#fafaf9]">
          Empty — <span className="font-medium text-[#1a1a19] underline">add the first lesson</span>
        </button>
      )}

      {adding && (
        <div className="px-4 py-3">
          <InlineAddForm
            placeholder={adding === "lesson" ? "Lesson title" : "Submodule title"}
            onDone={() => setAdding(null)}
            onAdd={async (t) => {
              const res =
                adding === "lesson"
                  ? await createLessonInModule({ courseId, moduleId: module.id, title: t })
                  : await createModule({ courseId, parentId: module.id, title: t });
              return res.ok ? null : res.error;
            }}
          />
        </div>
      )}
    </div>
  );

  if (!isTopLevel) {
    return (
      <div className={pending ? "opacity-70" : ""}>
        {header}
        {body}
      </div>
    );
  }
  return (
    <section className={`rounded-[12px] border border-[#e7e6e4] bg-white ${pending ? "opacity-70" : ""}`}>
      {header}
      {body}
    </section>
  );
}
