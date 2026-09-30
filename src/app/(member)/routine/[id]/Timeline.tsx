"use client";

import { useRef, useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragMoveEvent } from "@dnd-kit/core";
import {
  LANES,
  MIN_BLOCK_SECONDS,
  SNAP_SECONDS,
  formatTimecode,
  moveBlock,
  pixelsToSeconds,
  removeBlock,
  resizeBlock,
  snap,
  tickLabels,
  type RoutineItem,
} from "@/lib/practice/timeline";
import { TimelineBlock, type BlockPreview } from "./TimelineBlock";
import { Waveform } from "./Waveform";

const LANE_HEIGHT = 58;
const LANE_GAP = 6;
const BIG_STEP_SECONDS = 5;

export interface TimelineProps {
  items: RoutineItem[];
  names: ReadonlyMap<string, string>;
  duration: number;
  bpm: number | null;
  selected: number | null;
  activeIndex: number;
  playhead: number | null;
  waveSource: Blob | string | null;
  onSelect: (index: number | null) => void;
  onChange: (items: RoutineItem[], message?: string) => void;
}

function parseId(id: string | number): { kind: "move" | "resize"; index: number } {
  const [kind, index] = String(id).split(":");
  return { kind: kind === "resize" ? "resize" : "move", index: Number(index) };
}

/** Ticks, waveform and move lanes; blocks move and resize by drag or keyboard. */
export function Timeline({ items, names, duration, bpm, selected, activeIndex, playhead, waveSource, onSelect, onChange }: TimelineProps) {
  const lanesRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<{ index: number; pos: BlockPreview } | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const step = bpm ? Math.max(SNAP_SECONDS, snap(60 / bpm)) : SNAP_SECONDS;

  function target(id: string | number, dx: number, dy: number): BlockPreview | null {
    const { kind, index } = parseId(id);
    const it = items[index];
    const width = lanesRef.current?.getBoundingClientRect().width ?? 0;
    if (!it || width === 0) return null;
    const dt = pixelsToSeconds(dx, width, duration);
    if (kind === "resize") return { ...it, end: Math.min(duration, Math.max(it.start + MIN_BLOCK_SECONDS, snap(it.end + dt))) };
    const length = it.end - it.start;
    const start = Math.min(Math.max(0, snap(it.start + dt)), duration - length);
    const lane = Math.min(LANES - 1, Math.max(0, it.lane + Math.round(dy / (LANE_HEIGHT + LANE_GAP))));
    return { start, end: start + length, lane };
  }

  function onDragMove(e: DragMoveEvent) {
    const pos = target(e.active.id, e.delta.x, e.delta.y);
    if (pos) setPreview({ index: parseId(e.active.id).index, pos });
  }

  function onDragEnd(e: DragEndEvent) {
    setPreview(null);
    const { kind, index } = parseId(e.active.id);
    const pos = target(e.active.id, e.delta.x, e.delta.y);
    if (!pos) return;
    onSelect(index);
    if (kind === "resize") {
      onChange(resizeBlock(items, index, pos.end, duration));
      return;
    }
    const res = moveBlock(items, index, pos.start, pos.lane, duration);
    onChange(res.items, res.ok ? undefined : res.error);
  }

  function onKey(index: number, e: React.KeyboardEvent) {
    const it = items[index];
    const by = e.shiftKey ? BIG_STEP_SECONDS : step;
    let handled = true;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const res = moveBlock(items, index, it.start + (e.key === "ArrowLeft" ? -by : by), it.lane, duration);
      onChange(res.items, res.ok ? undefined : res.error);
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const res = moveBlock(items, index, it.start, it.lane + (e.key === "ArrowUp" ? -1 : 1), duration);
      onChange(res.items, res.ok ? undefined : res.error);
    } else if (e.key === "+" || e.key === "=" || e.key === "-") {
      onChange(resizeBlock(items, index, it.end + (e.key === "-" ? -by : by), duration));
    } else if (e.key === "Delete" || e.key === "Backspace") {
      onChange(removeBlock(items, index), `${names.get(it.move_id) ?? "Move"} removed.`);
      onSelect(null);
    } else if (e.key === "Enter" || e.key === " ") {
      onSelect(index);
    } else {
      handled = false;
    }
    if (handled) e.preventDefault();
  }

  return (
    <div className="track">
      <div className="ticks" aria-hidden>
        {tickLabels(duration).map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
      <Waveform source={waveSource} />
      <DndContext sensors={sensors} onDragMove={onDragMove} onDragEnd={onDragEnd} onDragCancel={() => setPreview(null)}>
        <div ref={lanesRef} style={{ position: "relative", minWidth: 640, display: "flex", flexDirection: "column", gap: LANE_GAP }} role="group" aria-label="Routine timeline">
          {Array.from({ length: LANES }, (_, lane) => (
            <div key={lane} className="lanes" style={{ position: "relative", height: LANE_HEIGHT, borderRadius: 14, boxShadow: "inset 0 0 0 1.5px rgba(36,48,54,.12)" }} onClick={(e) => e.target === e.currentTarget && onSelect(null)}>
              {!items.some((i) => i.lane === lane) && (
                <span className="faint" style={{ margin: "auto", fontSize: 12 }}>
                  {lane === 0 ? "Add moves from the list below" : "Second lane: layer a move over another"}
                </span>
              )}
            </div>
          ))}
          {items.map((it, i) => (
            <div key={`${it.move_id}-${i}`} style={{ position: "absolute", left: 0, right: 0, top: (preview?.index === i ? preview.pos.lane : it.lane) * (LANE_HEIGHT + LANE_GAP), height: LANE_HEIGHT, pointerEvents: "none" }}>
              <TimelineBlock
                index={i}
                item={it}
                preview={preview?.index === i ? preview.pos : null}
                name={names.get(it.move_id) ?? "Move"}
                duration={duration}
                selected={selected === i}
                playing={activeIndex === i}
                onSelect={() => onSelect(i)}
                onKey={(e) => onKey(i, e)}
              />
            </div>
          ))}
          {playhead !== null && (
            <span aria-hidden style={{ position: "absolute", top: -4, bottom: -4, left: `${(playhead / duration) * 100}%`, width: 2, background: "var(--orange)", borderRadius: 2, pointerEvents: "none" }} />
          )}
        </div>
      </DndContext>
      <span className="sr-only" aria-live="polite">
        {selected !== null && items[selected] ? `${names.get(items[selected].move_id) ?? "Move"} at ${formatTimecode(items[selected].start)}` : ""}
      </span>
    </div>
  );
}
