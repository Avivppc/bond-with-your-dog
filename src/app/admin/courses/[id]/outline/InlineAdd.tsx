"use client";

import { useState, useTransition } from "react";

interface InlineAddProps {
  label: string;
  placeholder: string;
  /** Returns an error message, or null on success. */
  onAdd: (title: string) => Promise<string | null>;
}

/** "+ Add" button that expands into a one-line title form (Enter to save, Esc to cancel). */
export function InlineAdd({ label, placeholder, onAdd }: InlineAddProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-bold text-orange-700 hover:text-orange-900"
      >
        + {label}
      </button>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const failure = await onAdd(trimmed);
      if (failure) {
        setError(failure);
        return;
      }
      setTitle("");
      setError(null);
    });
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
        placeholder={placeholder}
        maxLength={200}
        disabled={pending}
        className="flex-1 border border-slate-300 rounded-md px-2 py-1 text-sm"
      />
      <button
        type="submit"
        disabled={pending || !title.trim()}
        className="bg-orange-700 text-white px-3 py-1 rounded-full text-xs font-bold disabled:opacity-50"
      >
        Add
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500">
        Done
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      )}
    </form>
  );
}
