"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { CourseOutline, OutlineLessonRow, OutlineModule } from "@/lib/course-outline";
import { placePaywall } from "@/lib/paywall";
import { createModule, reorderModules, setCoursePaywall } from "../outline-actions";
import { DragHandle, SortableList, type DragHandleProps } from "./SortableList";
import { ModuleCard, type ExpandSignal } from "./ModuleCard";
import { InlineAddForm } from "./InlineAdd";
import { ActionMenu, MENU_ITEM } from "./ActionMenu";
import type { ModuleOption } from "./LessonItem";

interface CourseOutlineEditorProps {
  courseId: string;
  outline: CourseOutline;
  /** Top-level module the paywall follows, or null when the course has none. */
  paywallAfterModuleId: string | null;
}

interface SearchHit {
  lesson: OutlineLessonRow;
  path: string;
}

const PAYWALL_ID = "paywall";
type OutlineRow = OutlineModule | { id: typeof PAYWALL_ID };

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

/** Modules with the paywall marker slotted in after its module (Kajabi shows it as a bar in the list). */
function rowsWithPaywall(modules: readonly OutlineModule[], afterId: string | null): OutlineRow[] {
  if (!afterId || !modules.some((m) => m.id === afterId)) return [...modules];
  return modules.flatMap((m): OutlineRow[] => (m.id === afterId ? [m, { id: PAYWALL_ID }] : [m]));
}

/** Kajabi-style outline: module cards → submodules → lessons, drag to reorder, paywall bar, status menus. */
export function CourseOutlineEditor({ courseId, outline, paywallAfterModuleId }: CourseOutlineEditorProps) {
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [addingModule, setAddingModule] = useState(false);
  const [expand, setExpand] = useState<ExpandSignal>({ open: true, version: 0 });
  const [pending, startTransition] = useTransition();
  const moduleOptions = flattenModuleOptions(outline.modules);
  const trimmed = query.trim();
  const rows = rowsWithPaywall(outline.modules, paywallAfterModuleId);
  const hasPaywall = rows.some((r) => r.id === PAYWALL_ID);

  async function saveOrder(ids: string[]): Promise<boolean> {
    const placement = placePaywall(ids, PAYWALL_ID);
    if (!placement) {
      setError("The paywall needs at least one module above it.");
      return false;
    }
    const current = outline.modules.map((m) => m.id).join(",");
    if (placement.moduleIds.join(",") !== current) {
      const res = await reorderModules({ courseId, parentId: null, ids: placement.moduleIds });
      if (!res.ok) {
        setError(res.error);
        return false;
      }
    }
    if (hasPaywall && placement.paywallAfter !== paywallAfterModuleId) {
      const res = await setCoursePaywall({ courseId, afterModuleId: placement.paywallAfter });
      if (!res.ok) {
        setError(res.error);
        return false;
      }
    }
    return true;
  }

  function setPaywall(afterModuleId: string | null) {
    startTransition(async () => {
      const res = await setCoursePaywall({ courseId, afterModuleId });
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative block min-w-56 flex-1">
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
        <ActionMenu
          label="Add content"
          trigger={
            <>
              <span className="material-symbols-outlined text-[18px]" aria-hidden>
                add
              </span>
              Add content
            </>
          }
          triggerClassName="inline-flex items-center gap-1 rounded-full bg-[#343332] px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          {(close) => (
            <>
              <button type="button" className={MENU_ITEM} onClick={() => (close(), setAddingModule(true), setQuery(""))}>
                <span className="material-symbols-outlined text-[18px]" aria-hidden>
                  folder
                </span>
                Module
              </button>
              <Link href={`/admin/courses/${courseId}/import`} className={MENU_ITEM} onClick={close}>
                <span className="material-symbols-outlined text-[18px]" aria-hidden>
                  table_view
                </span>
                Import from spreadsheet
              </Link>
              {!hasPaywall && outline.modules.length > 1 && (
                <button type="button" className={MENU_ITEM} onClick={() => (close(), setPaywall(outline.modules[0].id))}>
                  <span className="material-symbols-outlined text-[18px]" aria-hidden>
                    lock
                  </span>
                  Paywall
                </button>
              )}
            </>
          )}
        </ActionMenu>
      </div>

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
      ) : outline.modules.length === 0 && !addingModule ? (
        <div className="rounded-[12px] border border-dashed border-[#d9d8d6] px-6 py-10 text-center">
          <p className="font-medium">Start with your first module</p>
          <p className="mt-1 text-sm text-[#6c6a69]">Modules group lessons, like chapters. You can also import a whole outline from a spreadsheet.</p>
          <button type="button" onClick={() => setAddingModule(true)} className="mt-4 rounded-full bg-[#343332] px-4 py-2 text-sm font-medium text-white">
            Add module
          </button>
        </div>
      ) : (
        <SortableList<OutlineRow>
          key={rows.map((r) => r.id).join(",")}
          items={rows}
          onReorder={saveOrder}
          className="space-y-3"
          renderItem={(row, handle) =>
            row.id === PAYWALL_ID ? (
              <PaywallBar handle={handle} disabled={pending} onRemove={() => setPaywall(null)} />
            ) : (
              <ModuleCard
                courseId={courseId}
                module={row as OutlineModule}
                handle={handle}
                moduleOptions={moduleOptions}
                expandSignal={expand}
                onError={setError}
              />
            )
          }
        />
      )}

      {!trimmed && addingModule && (
        <div className="rounded-[12px] border border-[#e7e6e4] bg-white px-4 py-3">
          <InlineAddForm
            placeholder="Module title"
            onDone={() => setAddingModule(false)}
            onAdd={async (title) => {
              const res = await createModule({ courseId, parentId: null, title });
              return res.ok ? null : res.error;
            }}
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
    </div>
  );
}

function PaywallBar({ handle, onRemove, disabled }: { handle: DragHandleProps; onRemove: () => void; disabled: boolean }) {
  return (
    <div className="group flex items-center gap-2 rounded-[8px] bg-[#eef0ff] px-2 py-2.5 text-sm text-[#3b2fa8]">
      <DragHandle {...handle} label="paywall" />
      <span className="material-symbols-outlined text-[18px]" aria-hidden>
        lock
      </span>
      <b>Paywall</b>
      <span className="min-w-0 flex-1 truncate text-xs text-[#5b53b5]">
        · Members with a limited-access offer only see the modules above this line. Drag it to move.
      </span>
      <button type="button" onClick={onRemove} disabled={disabled} className="shrink-0 text-xs font-medium underline hover:no-underline">
        Remove
      </button>
    </div>
  );
}

function SearchResults({ courseId, hits }: { courseId: string; hits: readonly SearchHit[] }) {
  if (hits.length === 0) return <p className="py-6 text-center text-sm text-[#6c6a69]">No modules or lessons match.</p>;
  return (
    <ul className="divide-y divide-[#efeeed] overflow-hidden rounded-[12px] border border-[#e7e6e4] bg-white">
      {hits.map(({ lesson, path }) => (
        <li key={lesson.id}>
          <Link href={`/admin/courses/${courseId}/lessons/${lesson.id}`} className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[#fafaf9]">
            <span className="material-symbols-outlined text-[18px] text-[#6c6a69]" aria-hidden>
              {lesson.kind === "quiz" ? "quiz" : "videocam"}
            </span>
            <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
            <span className="truncate text-xs text-[#9b9997]">{path}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
