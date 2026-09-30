"use client";

interface PublishToggleProps {
  published: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

/** Kajabi-style status pill; clicking switches between Published and Draft. */
export function PublishToggle({ published, onToggle, disabled }: PublishToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={published}
      title={published ? "Published — click to switch to draft" : "Draft — click to publish"}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-60 ${
        published ? "bg-[#e3f5e8] text-[#1c6b35] hover:bg-[#d3eedb]" : "bg-[#f0efee] text-[#4b4a48] hover:bg-[#e6e5e3]"
      }`}
    >
      {published && <span aria-hidden>✓</span>}
      {published ? "Published" : "Draft"}
      <span aria-hidden className="material-symbols-outlined text-[14px] leading-none">
        expand_more
      </span>
    </button>
  );
}
