"use client";

import { Ms } from "@/components/app/ui";
import { formatTimecode, type RoutineItem } from "@/lib/practice/timeline";

export type BlockCommand = "earlier" | "later" | "shorter" | "longer" | "lane" | "remove";

const BUTTONS: { cmd: BlockCommand; icon: string; label: string }[] = [
  { cmd: "earlier", icon: "chevron_left", label: "Earlier" },
  { cmd: "later", icon: "chevron_right", label: "Later" },
  { cmd: "shorter", icon: "remove", label: "Shorter" },
  { cmd: "longer", icon: "add", label: "Longer" },
  { cmd: "lane", icon: "swap_vert", label: "Other lane" },
];

/** Button alternative to dragging, for the selected move. */
export function BlockControls({ item, name, onCommand }: { item: RoutineItem; name: string; onCommand: (cmd: BlockCommand) => void }) {
  return (
    <div className="row" role="toolbar" aria-label={`Edit ${name}`} style={{ gap: 8 }}>
      <span className="faint num" style={{ marginRight: 4 }}>
        <b style={{ color: "var(--ink)" }}>{name}</b> · {formatTimecode(item.start)}–{formatTimecode(item.end)}
      </span>
      {BUTTONS.map((b) => (
        <button key={b.cmd} type="button" className="chip" onClick={() => onCommand(b.cmd)}>
          <Ms name={b.icon} size="sm" />
          {b.label}
        </button>
      ))}
      <button type="button" className="chip" style={{ color: "var(--danger)" }} onClick={() => onCommand("remove")}>
        <Ms name="delete" size="sm" />
        Remove
      </button>
    </div>
  );
}
