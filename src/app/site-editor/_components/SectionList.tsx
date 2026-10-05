"use client";

import { useId } from "react";
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SECTION_DEFS } from "@/lib/site/registry";
import type { SectionInstance } from "@/lib/site/page-doc";
import { PanelHeader } from "./shell";

const ROW_BTN = "flex h-7 w-7 items-center justify-center rounded-[6px] text-[#6c6a69] hover:bg-[#efeeed] hover:text-[#1a1a19] disabled:opacity-30";

/** A copy of a section, placed right after it, with an id not used on the page. */
export function duplicateSection(sections: SectionInstance[], i: number): SectionInstance[] {
  const taken = new Set(sections.map((s) => s.id));
  const base = sections[i].id.replace(/-\d+$/, "").slice(0, 34);
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  const copy = { ...structuredClone(sections[i]), id: `${base}-${n}` };
  return [...sections.slice(0, i + 1), copy, ...sections.slice(i + 1)];
}

interface RowProps {
  section: SectionInstance;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

function Row({ section, selected, onSelect, onToggle, onDuplicate, onRemove }: RowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const def = SECTION_DEFS[section.type];
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group flex items-center gap-0.5 rounded-[8px] px-1 ${isDragging ? "relative z-10 bg-white shadow-md" : selected ? "bg-[#efeeed]" : "hover:bg-[#f8f8f8]"}`}
    >
      <button type="button" className={`${ROW_BTN} cursor-grab touch-none active:cursor-grabbing`} aria-label={`Drag ${def?.label ?? "section"} to reorder`} {...attributes} {...listeners}>
        <span className="material-symbols-outlined text-[18px]">drag_indicator</span>
      </button>
      <button type="button" onClick={onSelect} className={`flex min-w-0 flex-1 items-center gap-2 px-1 py-2 text-left text-[13px] ${section.hidden ? "text-[#9b9997] line-through" : ""}`}>
        <span className="material-symbols-outlined text-[18px] text-[#6c6a69]">{def?.icon ?? "help"}</span>
        <span className="truncate">{def?.label ?? section.type}</span>
      </button>
      <div className="flex opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
        <button type="button" className={ROW_BTN} onClick={onToggle} aria-label={section.hidden ? "Show section" : "Hide section"} title={section.hidden ? "Show" : "Hide"}>
          <span className="material-symbols-outlined text-[18px]">{section.hidden ? "visibility_off" : "visibility"}</span>
        </button>
        <button type="button" className={ROW_BTN} onClick={onDuplicate} aria-label="Duplicate section" title="Duplicate">
          <span className="material-symbols-outlined text-[18px]">content_copy</span>
        </button>
        <button type="button" className={ROW_BTN} onClick={onRemove} aria-label="Remove section" title="Remove (undo with Cmd+Z)">
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>
    </li>
  );
}

interface SectionListProps {
  sections: SectionInstance[];
  selected: string | null;
  onSelect: (id: string) => void;
  onChange: (next: SectionInstance[]) => void;
  onAdd: (index: number) => void;
  onPageSettings: () => void;
  onHistory: () => void;
}

/** The page's sections, top to bottom: drag to reorder; show/hide, duplicate and remove. */
export function SectionList({ sections, selected, onSelect, onChange, onAdd, onPageSettings, onHistory }: SectionListProps) {
  const dndId = useId();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = sections.map((s) => s.id);
    onChange(arrayMove(sections, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id))));
  }

  return (
    <div>
      <PanelHeader title="Sections">
        <button type="button" onClick={onHistory} className={ROW_BTN} aria-label="Published versions" title="Published versions">
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
      </ul>
      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="px-2">
            {sections.map((s, i) => (
              <Row
                key={s.id}
                section={s}
                selected={selected === s.id}
                onSelect={() => onSelect(s.id)}
                onToggle={() => onChange(sections.map((x, j) => (j === i ? { ...x, hidden: !x.hidden } : x)))}
                onDuplicate={() => onChange(duplicateSection(sections, i))}
                onRemove={() => onChange(sections.filter((_, j) => j !== i))}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <ul className="p-2">
        <li>
          <button type="button" onClick={() => onAdd(sections.length)} className="flex w-full items-center gap-2 rounded-[8px] px-2 py-2 text-[13px] font-medium text-[#1d4f91] hover:bg-[#e6f0fb]">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>Add section
          </button>
        </li>
        <li className="flex items-center gap-2 rounded-[8px] px-2 py-2 text-[13px] text-[#9b9997]">
          <span className="material-symbols-outlined text-[18px]">call_to_action</span>Footer (edit in Theme)
        </li>
      </ul>
      <p className="px-4 pb-4 text-[12px] text-[#9b9997]">Tip: click anything in the preview to edit it. Cmd+Z undoes.</p>
    </div>
  );
}
