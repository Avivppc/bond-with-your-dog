"use client";

import { useDraggable } from "@dnd-kit/core";
import { formatTimecode, type RoutineItem } from "@/lib/practice/timeline";

export interface BlockPreview {
  start: number;
  end: number;
  lane: number;
}

const HANDLE_WIDTH = 10;

/** One move on the timeline: drag to move, drag the right edge to resize, keys when focused. */
export function TimelineBlock({
  index,
  item,
  preview,
  name,
  duration,
  selected,
  playing,
  onSelect,
  onKey,
}: {
  index: number;
  item: RoutineItem;
  preview: BlockPreview | null;
  name: string;
  duration: number;
  selected: boolean;
  playing: boolean;
  onSelect: () => void;
  onKey: (e: React.KeyboardEvent) => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: `move:${index}` });
  const { listeners: resizeListeners, setNodeRef: setResizeRef } = useDraggable({ id: `resize:${index}` });
  const pos = preview ?? item;
  const left = (pos.start / duration) * 100;
  const width = ((pos.end - pos.start) / duration) * 100;
  const ring = selected ? "inset 0 0 0 3px rgba(255,255,255,.9)" : playing ? "inset 0 0 0 3px var(--gold)" : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-current={playing ? "true" : undefined}
      aria-label={`${name}, ${formatTimecode(item.start)} to ${formatTimecode(item.end)}, lane ${item.lane + 1}. Arrow keys move it, Shift for bigger steps, plus and minus change its length, Delete removes it.`}
      className={`block c${(index % 5) + 1}`}
      onClick={onSelect}
      onKeyDown={onKey}
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        left: `${left}%`,
        width: `${width}%`,
        boxShadow: ring,
        cursor: "grab",
        touchAction: "none",
        pointerEvents: "auto",
        opacity: preview ? 0.85 : 1,
        zIndex: preview ? 2 : 1,
        paddingRight: HANDLE_WIDTH + 4,
      }}
    >
      <b>{name}</b>
      <span className="num" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
        {formatTimecode(pos.start)}–{formatTimecode(pos.end)}
      </span>
      <span
        ref={setResizeRef}
        onPointerDown={(e) => {
          // Start the resize drag only (not the block move underneath).
          resizeListeners?.onPointerDown?.(e);
          e.stopPropagation();
        }}
        onClick={(e) => e.stopPropagation()}
        aria-hidden
        title="Drag to change the length"
        style={{ position: "absolute", top: 8, bottom: 8, right: 3, width: HANDLE_WIDTH - 4, borderRadius: 4, background: "rgba(255,255,255,.55)", cursor: "ew-resize", touchAction: "none" }}
      />
    </div>
  );
}
