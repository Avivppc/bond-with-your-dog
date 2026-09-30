"use client";

import { useState, useTransition } from "react";
import type { OutlineModule } from "@/lib/course-outline";
import { createLessonInModule, createModule, deleteModule, reorderLessons, reorderModules, updateModule } from "../outline-actions";
import { DragHandle, SortableList, type DragHandleProps } from "./SortableList";
import { LessonItem, type ModuleOption } from "./LessonItem";
import { InlineAddForm } from "./InlineAdd";
import { PublishToggle } from "./PublishToggle";
import { ActionMenu, MENU_ITEM } from "./ActionMenu";

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

export function ModuleCard({ courseId, module, handle, moduleOptions, expandSignal, onError }: ModuleCardProps) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(module.title);
  // A local toggle only counts until the next "Expand all / Collapse all".
  const [override, setOverride] = useState<ExpandSignal | null>(null);
  const open = override && override.version === expandSignal.version ? override.open : expandSignal.open;
  const setOpen = (next: boolean) => setOverride({ open: next, version: expandSignal.version });
  const [adding, setAdding] = useState<Adding>(null);
  const isTopLevel = module.parent_id === null;
  const itemCount = module.lessons.length + module.submodules.length;

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const res = await action();
      if (!res.ok && res.error) onError(res.error);
    });
  }

  function saveTitle() {
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

  return (
    <div className={`${isTopLevel ? "" : "ml-8 border-l border-[#efeeed]"} ${pending ? "opacity-70" : ""}`}>
      <div className={`flex items-center gap-2 py-2.5 pl-2 pr-3 ${isTopLevel ? "bg-[#fafaf9]" : ""}`}>
        <DragHandle {...handle} label={module.title} />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? `Collapse ${module.title}` : `Expand ${module.title}`}
          className="flex rounded text-[#6c6a69] hover:text-[#1a1a19]"
        >
          <span className={`material-symbols-outlined text-[20px] transition-transform ${open ? "" : "-rotate-90"}`} aria-hidden>
            expand_more
          </span>
        </button>
        <span className="material-symbols-outlined text-[18px] text-[#6c6a69]" aria-hidden>
          {isTopLevel ? "folder" : "folder_open"}
        </span>
        <input
          aria-label="Module title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          maxLength={200}
          className="min-w-0 flex-1 rounded bg-transparent px-1 text-sm font-medium text-[#1a1a19] focus:bg-white focus:outline focus:outline-1 focus:outline-[#d9d8d6]"
        />
        {!open && itemCount > 0 && <span className="text-xs text-[#9b9997]">{itemCount} items</span>}
        <ActionMenu
          label={`Add content to ${module.title}`}
          trigger={
            <>
              <span aria-hidden>+</span> Add content
            </>
          }
          triggerClassName="hidden items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-[#1a1a19] hover:bg-[#efeeed] sm:inline-flex"
        >
          {(close) => (
            <>
              <button type="button" className={MENU_ITEM} onClick={() => (startAdding("lesson"), close())}>
                <span className="material-symbols-outlined text-[18px]" aria-hidden>
                  smart_display
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
          onToggle={() => run(() => updateModule({ courseId, id: module.id, published: !module.published }))}
        />
        <ActionMenu
          label={`Actions for ${module.title}`}
          trigger={
            <span className="material-symbols-outlined text-[20px]" aria-hidden>
              more_horiz
            </span>
          }
          triggerClassName="flex rounded-[6px] p-0.5 text-[#6c6a69] hover:bg-[#efeeed] hover:text-[#1a1a19]"
        >
          {(close) => (
            <>
              <button type="button" className={`${MENU_ITEM} sm:hidden`} onClick={() => (startAdding("lesson"), close())}>
                Add lesson
              </button>
              <button type="button" className={`${MENU_ITEM} text-red-700`} onClick={() => (close(), remove())}>
                Delete {isTopLevel ? "module" : "submodule"}
              </button>
            </>
          )}
        </ActionMenu>
      </div>

      {open && (
        <div className="divide-y divide-[#f3f3f2] border-t border-[#f3f3f2] pl-6">
          {module.lessons.length > 0 && (
            <SortableList
              key={orderKey(module.lessons)}
              items={module.lessons}
              onReorder={saveLessonOrder}
              className="divide-y divide-[#f3f3f2]"
              renderItem={(lesson, h) => (
                <LessonItem courseId={courseId} lesson={lesson} handle={h} moduleOptions={moduleOptions} onError={onError} />
              )}
            />
          )}

          {module.submodules.length > 0 && (
            <SortableList
              key={orderKey(module.submodules)}
              items={module.submodules}
              onReorder={saveSubmoduleOrder}
              className="divide-y divide-[#f3f3f2]"
              renderItem={(sub, h) => (
                <ModuleCard
                  courseId={courseId}
                  module={sub}
                  handle={h}
                  moduleOptions={moduleOptions}
                  expandSignal={expandSignal}
                  onError={onError}
                />
              )}
            />
          )}

          {itemCount === 0 && !adding && <p className="px-3 py-3 text-xs text-[#9b9997]">Empty — use “Add content” to add a lesson.</p>}

          {adding && (
            <div className="px-3 py-3">
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
      )}
    </div>
  );
}
