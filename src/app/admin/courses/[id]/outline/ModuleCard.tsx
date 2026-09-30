"use client";

import { useState, useTransition } from "react";
import type { OutlineModule } from "@/lib/course-outline";
import {
  createLessonInModule,
  createModule,
  deleteModule,
  reorderLessons,
  reorderModules,
  updateModule,
} from "../outline-actions";
import { DragHandle, SortableList, type DragHandleProps } from "./SortableList";
import { LessonItem, type ModuleOption } from "./LessonItem";
import { InlineAdd } from "./InlineAdd";
import { PublishToggle } from "./PublishToggle";

interface ModuleCardProps {
  courseId: string;
  module: OutlineModule;
  handle: DragHandleProps;
  moduleOptions: readonly ModuleOption[];
  onError: (message: string) => void;
}

const orderKey = (items: readonly { id: string }[]) => items.map((i) => i.id).join(",");

export function ModuleCard({ courseId, module, handle, moduleOptions, onError }: ModuleCardProps) {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(module.title);
  const isTopLevel = module.parent_id === null;

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
    if (!window.confirm(`Delete "${module.title}"?`)) return;
    run(() => deleteModule({ courseId, id: module.id }));
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
    <div
      className={`rounded-xl border ${isTopLevel ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50/60"} ${
        pending ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
        <DragHandle {...handle} label={module.title} />
        <input
          aria-label="Module title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          maxLength={200}
          className={`flex-1 min-w-0 bg-transparent font-extrabold ${isTopLevel ? "text-base" : "text-sm"} text-slate-800 rounded px-1 focus:bg-white focus:outline focus:outline-orange-300`}
        />
        <PublishToggle
          published={module.published}
          disabled={pending}
          onToggle={() => run(() => updateModule({ courseId, id: module.id, published: !module.published }))}
        />
        <button type="button" onClick={remove} disabled={pending} className="text-xs text-red-600 hover:text-red-800 px-1">
          Delete
        </button>
      </div>

      <div className="px-3 py-2 space-y-2">
        {module.lessons.length > 0 && (
          <SortableList
            key={orderKey(module.lessons)}
            items={module.lessons}
            onReorder={saveLessonOrder}
            renderItem={(lesson, h) => (
              <LessonItem
                courseId={courseId}
                lesson={lesson}
                handle={h}
                moduleOptions={moduleOptions}
                onError={onError}
              />
            )}
          />
        )}

        {module.submodules.length > 0 && (
          <SortableList
            key={orderKey(module.submodules)}
            items={module.submodules}
            onReorder={saveSubmoduleOrder}
            className="space-y-2"
            renderItem={(sub, h) => (
              <ModuleCard courseId={courseId} module={sub} handle={h} moduleOptions={moduleOptions} onError={onError} />
            )}
          />
        )}

        <div className="flex flex-wrap items-center gap-4 pt-1">
          <InlineAdd
            label="Lesson"
            placeholder="Lesson title"
            onAdd={async (t) => {
              const res = await createLessonInModule({ courseId, moduleId: module.id, title: t });
              return res.ok ? null : res.error;
            }}
          />
          {isTopLevel && (
            <InlineAdd
              label="Submodule"
              placeholder="Submodule title"
              onAdd={async (t) => {
                const res = await createModule({ courseId, parentId: module.id, title: t });
                return res.ok ? null : res.error;
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
