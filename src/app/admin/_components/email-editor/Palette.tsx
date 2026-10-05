"use client";

import { useId } from "react";
import type { EmailBlockType } from "@/lib/email-blocks/types";
import { MUTED } from "../ui";
import { BLOCK_META, BLOCK_TYPES } from "./block-meta";

/** What is being dragged: a new block from the palette, or an existing block being reordered. */
export type DragItem = { source: "palette"; type: EmailBlockType } | { source: "list"; id: string };

interface PaletteProps {
  types?: readonly EmailBlockType[];
  onAdd: (type: EmailBlockType) => void;
  onDragChange: (item: DragItem | null) => void;
}

/** The "Add" column: drag a block type into the email, or click to add it at the end. */
export function Palette({ types = BLOCK_TYPES, onAdd, onDragChange }: PaletteProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <div>
        <h3 id={headingId} className="text-sm font-semibold text-[#1a1a19]">
          Add
        </h3>
        <p className={`text-xs ${MUTED}`}>Drag into the email, or click to add at the end.</p>
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-1">
        {types.map((type) => {
          const meta = BLOCK_META[type];
          return (
            <li key={type}>
              <button
                type="button"
                draggable
                onClick={() => onAdd(type)}
                onDragStart={(e) => {
                  e.dataTransfer.effectAllowed = "copy";
                  e.dataTransfer.setData("text/plain", `email-block:${type}`);
                  onDragChange({ source: "palette", type });
                }}
                onDragEnd={() => onDragChange(null)}
                aria-label={`Add ${meta.label} block`}
                title={meta.hint}
                className="flex w-full cursor-grab items-center gap-2 rounded-[10px] border border-[#e7e6e4] bg-white px-3 py-2 text-left text-[13px] font-medium text-[#1a1a19] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:border-[#0e666a] hover:bg-[#f6fbfb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0e666a]/40 active:cursor-grabbing"
              >
                <span className="material-symbols-outlined text-[20px] text-[#0e666a]" aria-hidden>
                  {meta.icon}
                </span>
                {meta.label}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
