"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { EmailBlock } from "@/lib/email-blocks/types";
import { MUTED } from "../ui";
import { BLOCK_META, blockSummary } from "./block-meta";
import type { DragItem } from "./Palette";

/**
 * The email's blocks as cards. Drag a card's header (or a palette item) to a position — a teal line
 * shows where it will land. Each card also has move up/down, duplicate and delete buttons, and
 * Alt+↑/↓ on its title moves it. The selected card shows its fields.
 */

interface BlockListProps {
  blocks: readonly EmailBlock[];
  selectedId: string | null;
  drag: DragItem | null;
  onDragChange: (item: DragItem | null) => void;
  /** A drop at a gap index (0 = top, blocks.length = bottom). */
  onDrop: (item: DragItem, index: number) => void;
  onSelect: (id: string | null) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  renderFields: (block: EmailBlock) => React.ReactNode;
}

const ICON_BASE =
  "inline-flex h-8 w-8 items-center justify-center rounded-full text-[#6c6a69] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e666a]/40 disabled:pointer-events-none disabled:opacity-30";
const ICON_BUTTON = `${ICON_BASE} hover:bg-[#f0efee] hover:text-[#1a1a19]`;
const ICON_DANGER = `${ICON_BASE} hover:bg-red-50 hover:text-red-700`;

function DropLine({ position }: { position: "top" | "bottom" }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-x-0 z-10 h-[3px] rounded-full bg-[#0e666a] ${position === "top" ? "-top-[7px]" : "-bottom-[7px]"}`}
    />
  );
}

export function BlockList(props: BlockListProps) {
  const { blocks, selectedId, drag, onDragChange, onDrop } = props;
  const headingId = useId();
  // The drop position belongs to one drag; a new drag (a new DragItem) starts without one.
  const [dropAt, setDropAt] = useState<{ drag: DragItem; index: number } | null>(null);
  const dropIndex = drag && dropAt?.drag === drag ? dropAt.index : null;

  function setDropIndex(index: number | null) {
    if (index === dropIndex) return;
    setDropAt(drag && index !== null ? { drag, index } : null);
  }

  function overCard(e: React.DragEvent<HTMLElement>, index: number) {
    if (!drag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = drag.source === "palette" ? "copy" : "move";
    const rect = e.currentTarget.getBoundingClientRect();
    setDropIndex(e.clientY < rect.top + rect.height / 2 ? index : index + 1);
  }

  function handleDrop(e: React.DragEvent<HTMLElement>) {
    e.preventDefault();
    if (drag && dropIndex !== null) onDrop(drag, dropIndex);
    setDropIndex(null);
    onDragChange(null);
  }

  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-2"
      onDragOver={(e) => drag && e.preventDefault()}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropIndex(null);
      }}
      onDrop={handleDrop}
    >
      <h3 id={headingId} className="text-sm font-semibold text-[#1a1a19]">
        Email content
      </h3>
      <ol className="flex flex-col gap-3">
        {blocks.map((block, index) => (
          <li key={block.id} className="relative" onDragOver={(e) => overCard(e, index)}>
            {dropIndex === index && <DropLine position="top" />}
            <BlockCard {...props} block={block} index={index} selected={block.id === selectedId} />
          </li>
        ))}
      </ol>
      <div
        onDragOver={(e) => {
          if (!drag) return;
          e.preventDefault();
          setDropIndex(blocks.length);
        }}
        className={`relative rounded-[12px] border-2 border-dashed px-4 py-5 text-center text-xs ${
          drag ? "border-[#0e666a]/50 bg-[#f6fbfb] text-[#0e666a]" : `border-[#e7e6e4] ${MUTED}`
        }`}
      >
        {dropIndex === blocks.length && blocks.length > 0 && <DropLine position="top" />}
        {blocks.length === 0 ? "This email is empty. Drag a block here or click one in Add." : "Drop here to add at the end"}
      </div>
    </section>
  );
}

interface BlockCardProps extends BlockListProps {
  block: EmailBlock;
  index: number;
  selected: boolean;
}

function BlockCard({ block, index, selected, blocks, onDragChange, onSelect, onMove, onDuplicate, onRemove, renderFields }: BlockCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const meta = BLOCK_META[block.type];
  const fieldsId = `email-block-${block.id}-fields`;

  useEffect(() => {
    if (selected) cardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  function onTitleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (!e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    onMove(block.id, e.key === "ArrowUp" ? -1 : 1);
  }

  return (
    <div
      ref={cardRef}
      className={`rounded-[12px] border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${
        selected ? "border-[#343332] ring-2 ring-black/5" : "border-[#e7e6e4] hover:border-[#c9c8c6]"
      }`}
    >
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", `email-block:${block.id}`);
          if (cardRef.current) e.dataTransfer.setDragImage(cardRef.current, 24, 20);
          onDragChange({ source: "list", id: block.id });
        }}
        onDragEnd={() => onDragChange(null)}
        className="flex items-center gap-1 py-1.5 pl-1.5 pr-2"
      >
        <span className="material-symbols-outlined cursor-grab px-1 text-[20px] text-[#9b9997] active:cursor-grabbing" aria-hidden title="Drag to reorder">
          drag_indicator
        </span>
        <button
          type="button"
          onClick={() => onSelect(selected ? null : block.id)}
          onKeyDown={onTitleKeyDown}
          aria-expanded={selected}
          aria-controls={selected ? fieldsId : undefined}
          aria-label={`${meta.label} block ${index + 1}: ${blockSummary(block)}. ${selected ? "Collapse" : "Edit"}. Alt+arrow keys move it.`}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-[8px] px-1.5 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e666a]/40"
        >
          <span className="material-symbols-outlined text-[20px] text-[#0e666a]" aria-hidden>
            {meta.icon}
          </span>
          <span className="shrink-0 text-[13px] font-semibold text-[#1a1a19]">{meta.label}</span>
          <span className={`min-w-0 truncate text-[13px] ${MUTED}`}>{blockSummary(block)}</span>
        </button>
        <div className="flex shrink-0 items-center">
          <button type="button" className={ICON_BUTTON} onClick={() => onMove(block.id, -1)} disabled={index === 0} aria-label={`Move ${meta.label} block up`}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              arrow_upward
            </span>
          </button>
          <button
            type="button"
            className={ICON_BUTTON}
            onClick={() => onMove(block.id, 1)}
            disabled={index === blocks.length - 1}
            aria-label={`Move ${meta.label} block down`}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              arrow_downward
            </span>
          </button>
          <button type="button" className={ICON_BUTTON} onClick={() => onDuplicate(block.id)} aria-label={`Duplicate ${meta.label} block`}>
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              content_copy
            </span>
          </button>
          <button
            type="button"
            className={ICON_DANGER}
            onClick={() => onRemove(block.id)}
            aria-label={`Delete ${meta.label} block`}
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden>
              delete
            </span>
          </button>
        </div>
      </div>
      {selected && (
        <div id={fieldsId} className="border-t border-[#efeeed] px-4 pb-4 pt-3">
          {renderFields(block)}
        </div>
      )}
    </div>
  );
}
