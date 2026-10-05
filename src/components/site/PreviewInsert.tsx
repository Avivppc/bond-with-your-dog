"use client";

import { PREVIEW_MESSAGES } from "@/lib/site/preview-messages";

/** In the editor's preview only: a thin "+ Add section" line between sections. */
export function PreviewInsert({ index }: { index: number }) {
  return (
    <div className="group/insert relative z-30 h-0" data-preview-insert>
      <div className="absolute inset-x-0 -top-3 flex h-6 items-center justify-center opacity-0 transition-opacity group-hover/insert:opacity-100 focus-within:opacity-100">
        <div className="absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-[#2563eb]" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            window.parent.postMessage({ type: PREVIEW_MESSAGES.insert, index }, window.location.origin);
          }}
          className="relative flex items-center gap-1 rounded-full bg-[#2563eb] px-3 py-1 font-sans text-[12px] font-medium text-white shadow"
        >
          <span className="material-symbols-outlined text-[16px]" aria-hidden>
            add
          </span>
          Add section
        </button>
      </div>
    </div>
  );
}
