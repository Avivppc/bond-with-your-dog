"use client";

import { INPUT, LABEL } from "@/app/admin/_components/ui";
import { AddRowButton, Icon, RowControls } from "@/app/admin/courses/_editors/ListEditors";
import { useRows } from "@/app/admin/courses/_editors/useRows";
import { MAX_NEED_LABEL, MAX_NEEDS, NEED_ICONS, type NeedIcon, type NeedItem } from "@/lib/content/needs";

/** "What you'll need" rows: an icon from the curated set + a short label. */
export function NeedsEditor({ initial }: { initial: readonly NeedItem[] }) {
  const { rows, add, remove, move, update } = useRows<NeedItem>(initial);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className={`${LABEL} mb-1.5`}>What you&apos;ll need</legend>
      {rows.length === 0 && <p className="text-xs text-[#6c6a69]">Nothing listed yet.</p>}
      <ol className="flex flex-col gap-2">
        {rows.map((row, i) => (
          <li key={row.key} className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] bg-[#f0efee] text-[#1a1a19]">
              <Icon name={row.value.icon} />
            </span>
            <select
              name="need_icon"
              value={row.value.icon}
              onChange={(e) => update(i, { ...row.value, icon: e.target.value as NeedIcon })}
              aria-label={`Item ${i + 1} icon`}
              className={`${INPUT} w-40 shrink-0`}
            >
              {NEED_ICONS.map((n) => (
                <option key={n.icon} value={n.icon}>
                  {n.label}
                </option>
              ))}
            </select>
            <input
              name="need_label"
              value={row.value.label}
              onChange={(e) => update(i, { ...row.value, label: e.target.value })}
              maxLength={MAX_NEED_LABEL}
              placeholder="Soft, small treats"
              aria-label={`Item ${i + 1}`}
              className={INPUT}
            />
            <RowControls index={i} count={rows.length} itemLabel="item" onMove={move} onRemove={remove} />
          </li>
        ))}
      </ol>
      <AddRowButton onClick={() => add({ icon: NEED_ICONS[0].icon, label: "" })} disabled={rows.length >= MAX_NEEDS}>
        Add item
      </AddRowButton>
    </fieldset>
  );
}
