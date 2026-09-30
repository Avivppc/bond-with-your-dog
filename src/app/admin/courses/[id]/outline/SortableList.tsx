"use client";

import { useId, useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { moveItem } from "@/lib/course-outline";

export interface DragHandleProps {
  attributes: ReturnType<typeof useSortable>["attributes"];
  listeners: ReturnType<typeof useSortable>["listeners"];
}

interface SortableListProps<T extends { id: string }> {
  items: readonly T[];
  /** Persist the new order; return false to roll the UI back. */
  onReorder: (ids: string[]) => Promise<boolean>;
  renderItem: (item: T, handle: DragHandleProps) => ReactNode;
  className?: string;
}

/**
 * Vertical drag-and-drop list with optimistic reordering (mouse, touch and keyboard).
 * Remount it with a `key` derived from the server order so fresh data replaces local state.
 */
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderItem,
  className,
}: SortableListProps<T>) {
  // Stable id keeps dnd-kit's accessibility ids identical on server and client (no hydration mismatch).
  const dndId = useId();
  const [ids, setIds] = useState<string[]>(() => items.map((i) => i.id));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const byId = new Map(items.map((i) => [i.id, i]));

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const previous = ids;
    const next = moveItem(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    setIds(next);
    const saved = await onReorder(next);
    if (!saved) setIds(previous);
  }

  return (
    <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className={className}>
          {ids.map((id) => {
            const item = byId.get(id);
            return item ? <SortableRow key={id} id={id} render={(h) => renderItem(item, h)} /> : null;
          })}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ id, render }: { id: string; render: (handle: DragHandleProps) => ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1 }}
    >
      {render({ attributes, listeners })}
    </li>
  );
}

export function DragHandle({ attributes, listeners, label }: DragHandleProps & { label: string }) {
  return (
    <button
      type="button"
      aria-label={`Drag to reorder ${label}`}
      className="flex cursor-grab select-none items-center rounded text-[#b3b1ae] hover:text-[#1a1a19] active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <span className="material-symbols-outlined text-[18px]" aria-hidden>
        drag_indicator
      </span>
    </button>
  );
}
