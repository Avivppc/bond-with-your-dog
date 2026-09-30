"use client";

import { useState } from "react";
import Link from "next/link";
import type { CourseOutline, OutlineModule } from "@/lib/course-outline";
import { createModule, reorderModules } from "../outline-actions";
import { SortableList } from "./SortableList";
import { ModuleCard } from "./ModuleCard";
import { InlineAdd } from "./InlineAdd";
import type { ModuleOption } from "./LessonItem";

interface CourseOutlineEditorProps {
  courseId: string;
  outline: CourseOutline;
}

function flattenModuleOptions(modules: readonly OutlineModule[]): ModuleOption[] {
  return modules.flatMap((m) => [
    { id: m.id, label: m.title },
    ...m.submodules.map((s) => ({ id: s.id, label: `${m.title} › ${s.title}` })),
  ]);
}

/** Kajabi-style outline: modules → submodules → lessons, drag to reorder, draft/publish inline. */
export function CourseOutlineEditor({ courseId, outline }: CourseOutlineEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const moduleOptions = flattenModuleOptions(outline.modules);

  async function saveModuleOrder(ids: string[]): Promise<boolean> {
    const res = await reorderModules({ courseId, parentId: null, ids });
    if (!res.ok) setError(res.error);
    return res.ok;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div role="alert" className="flex items-center justify-between bg-red-50 text-red-800 text-sm rounded-lg px-4 py-2">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} className="font-bold">
            ×
          </button>
        </div>
      )}

      {outline.modules.length === 0 ? (
        <p className="text-slate-500 text-sm py-4">No modules yet. Add the first one below.</p>
      ) : (
        <SortableList
          key={outline.modules.map((m) => m.id).join(",")}
          items={outline.modules}
          onReorder={saveModuleOrder}
          className="space-y-3"
          renderItem={(m, handle) => (
            <ModuleCard courseId={courseId} module={m} handle={handle} moduleOptions={moduleOptions} onError={setError} />
          )}
        />
      )}

      {outline.unassigned.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <p className="font-bold text-amber-900 mb-1">Lessons without a module</p>
          <ul className="list-disc ps-5 text-amber-900">
            {outline.unassigned.map((l) => (
              <li key={l.id}>
                <Link href={`/admin/courses/${courseId}/lessons/${l.id}`} className="underline">
                  {l.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <InlineAdd
        label="Module"
        placeholder="Module title"
        onAdd={async (title) => {
          const res = await createModule({ courseId, parentId: null, title });
          return res.ok ? null : res.error;
        }}
      />
    </div>
  );
}
