"use client";

interface PublishToggleProps {
  published: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export function PublishToggle({ published, onToggle, disabled }: PublishToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={published}
      title={published ? "Published — click to switch to draft" : "Draft — click to publish"}
      className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase shrink-0 transition-colors ${
        published
          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {published ? "Published" : "Draft"}
    </button>
  );
}
