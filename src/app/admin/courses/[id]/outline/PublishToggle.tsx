"use client";

import { ActionMenu, MENU_ITEM } from "@/components/ui/ActionMenu";

interface PublishToggleProps {
  published: boolean;
  /** Called with the chosen status (only when it differs). */
  onChange: (published: boolean) => void;
  disabled?: boolean;
  /** What the status belongs to, for screen readers ("Welcome"). */
  label: string;
}

const PILL = {
  published: "bg-[#e3f5e8] text-[#1c6b35] hover:bg-[#d3eedb]",
  draft: "bg-[#f0efee] text-[#4b4a48] hover:bg-[#e6e5e3]",
};

/** Kajabi-style status pill ("✓ Published ▾") that opens a Published / Draft menu. */
export function PublishToggle({ published, onChange, disabled, label }: PublishToggleProps) {
  if (disabled) {
    return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium opacity-60 ${published ? PILL.published : PILL.draft}`}>{published ? "Published" : "Draft"}</span>;
  }
  return (
    <ActionMenu
      label={`Status of ${label}: ${published ? "Published" : "Draft"}`}
      triggerClassName={`inline-flex shrink-0 items-center gap-1 rounded-full py-0.5 pl-2.5 pr-1.5 text-xs font-medium transition-colors ${published ? PILL.published : PILL.draft}`}
      trigger={
        <>
          {published && <span aria-hidden>✓</span>}
          {published ? "Published" : "Draft"}
          <span aria-hidden className="material-symbols-outlined text-[16px] leading-none">
            expand_more
          </span>
        </>
      }
    >
      {(close) =>
        (
          [
            { value: true, name: "Published", hint: "Visible to students with access" },
            { value: false, name: "Draft", hint: "Hidden from students" },
          ] as const
        ).map((o) => (
          <button
            key={o.name}
            type="button"
            role="menuitemradio"
            aria-checked={o.value === published}
            className={MENU_ITEM}
            onClick={() => {
              close();
              if (o.value !== published) onChange(o.value);
            }}
          >
            <span className="material-symbols-outlined w-5 text-[18px]" aria-hidden>
              {o.value === published ? "check" : ""}
            </span>
            <span>
              <span className="block font-medium">{o.name}</span>
              <span className="block text-xs text-[#6c6a69]">{o.hint}</span>
            </span>
          </button>
        ))
      }
    </ActionMenu>
  );
}
