"use client";

import { useState } from "react";
import Link from "next/link";
import type { CourseOutline, OutlineLessonRow, OutlineModule } from "@/lib/course-outline";
import { createModule, reorderModules } from "../outline-actions";
import { SortableList } from "./SortableList";
import { ModuleCard, type ExpandSignal } from "./ModuleCard";
import { InlineAdd } from "./InlineAdd";
import type { ModuleOption } from "./LessonItem";

interface CourseOutlineEditorProps {
  courseId: string;
  outline: CourseOutline;
}

interface SearchHit {
  lesson: OutlineLessonRow;
  path: string;
}

function flattenModuleOptions(modules: readonly OutlineModule[]): ModuleOption[] {
  return modules.flatMap((m) => [{ id: m.id, label: m.title }, ...m.submodules.map((s) => ({ id: s.id, label: `${m.title} › ${s.title}` }))]);
}

/** Lessons whose title — or whose module/submodule title — contains the query. */
function searchOutline(modules: readonly OutlineModule[], query: string): SearchHit[] {
  const q = query.toLowerCase();
  const hits = (list: readonly OutlineLessonRow[], path: string, pathMatches: boolean): SearchHit[] =>
    list.filter((l) => pathMatches || l.title.toLowerCase().includes(q)).map((lesson) => ({ lesson, path }));
  return modules.flatMap((m) => {
    const moduleMatches = m.title.toLowerCase().includes(q);
    return [
      ...hits(m.lessons, m.title, moduleMatches),
      ...m.submodules.flatMap((s) => hits(s.lessons, `${m.title} › ${s.title}`, moduleMatches || s.title.toLowerCase().includes(q))),
    ];
  });
}

/** Kajabi-style outline: modules → submodules → lessons, drag to reorder, draft/publish inline. */
export function CourseOutlineEditor({ courseId, outline }: CourseOutlineEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [expand, setExpand] = useState<ExpandSignal>({ open: true, version: 0 });
  const moduleOptions = flattenModuleOptions(outline.modules);
  const trimmed = query.trim();

  async function saveModuleOrder(ids: string[]): Promise<boolean> {
    const res = await reorderModules({ courseId, parentId: null, ids });
    if (!res.ok) setError(res.error);
    return res.ok;
  }

  return (
    <div className="space-y-4">
      <label className="relative block">
        <span className="sr-only">Find module or lesson</span>
        <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[#9b9997]" aria-hidden>
          search
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find module or lesson…"
          className="w-full rounded-[8px] border border-[#d9d8d6] bg-white py-2 pl-9 pr-3 text-sm focus:border-[#343332] focus:outline-none"
        />
      </label>

      <div className="flex items-center justify-between">
        <p className="text-sm">
          <b>{outline.modules.length}</b> {outline.modules.length === 1 ? "Module" : "Modules"}
        </p>
        {!trimmed && outline.modules.length > 0 && (
          <button
            type="button"
            onClick={() => setExpand((e) => ({ open: !e.open, version: e.version + 1 }))}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#d9d8d6] bg-white px-3 py-1.5 text-sm font-medium hover:bg-[#f3f3f2]"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              {expand.open ? "unfold_less" : "unfold_more"}
            </span>
            {expand.open ? "Collapse all" : "Expand all"}
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="flex items-center justify-between rounded-[8px] border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="font-bold">
            ×
          </button>
        </div>
      )}

      {trimmed ? (
        <SearchResults courseId={courseId} hits={searchOutline(outline.modules, trimmed)} />
      ) : outline.modules.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-[#d9d8d6] px-6 py-10 text-center">
          <p className="font-medium">Start with your first module</p>
          <p className="mt-1 text-sm text-[#6c6a69]">Modules group lessons, like chapters. You can also import a whole outline from a spreadsheet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[12px] border border-[#e7e6e4]">
          <SortableList
            key={outline.modules.map((m) => m.id).join(",")}
            items={outline.modules}
            onReorder={saveModuleOrder}
            className="divide-y divide-[#e7e6e4]"
            renderItem={(m, handle) => (
              <ModuleCard courseId={courseId} module={m} handle={handle} moduleOptions={moduleOptions} expandSignal={expand} onError={setError} />
            )}
          />
        </div>
      )}

      {outline.unassigned.length > 0 && (
        <div className="rounded-[12px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <p className="mb-1 font-medium text-amber-900">Lessons without a module</p>
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

      {!trimmed && (
        <InlineAdd
          label="Add module"
          placeholder="Module title"
          onAdd={async (title) => {
            const res = await createModule({ courseId, parentId: null, title });
            return res.ok ? null : res.error;
          }}
        />
      )}
    </div>
  );
}

function SearchResults({ courseId, hits }: { courseId: string; hits: readonly SearchHit[] }) {
  if (hits.length === 0) return <p className="py-6 text-center text-sm text-[#6c6a69]">No modules or lessons match.</p>;
  return (
    <ul className="divide-y divide-[#efeeed] overflow-hidden rounded-[12px] border border-[#e7e6e4]">
      {hits.map(({ lesson, path }) => (
        <li key={lesson.id}>
          <Link href={`/admin/courses/${courseId}/lessons/${lesson.id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[#fafaf9]">
            <span className="material-symbols-outlined text-[18px] text-[#6c6a69]" aria-hidden>
              {lesson.kind === "quiz" ? "quiz" : "smart_display"}
            </span>
            <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
            <span className="truncate text-xs text-[#9b9997]">{path}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
