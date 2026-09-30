"use client";

import { useState, useTransition } from "react";

interface InlineAddFormProps {
  placeholder: string;
  /** Returns an error message, or null on success. */
  onAdd: (title: string) => Promise<string | null>;
  onDone: () => void;
}

/** One-line title form (Enter to save and keep adding, Esc to close). */
export function InlineAddForm({ placeholder, onAdd, onDone }: InlineAddFormProps) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && onDone()}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={200}
        disabled={pending}
        className="min-w-48 flex-1 rounded-[8px] border border-[#d9d8d6] bg-white px-3 py-1.5 text-sm focus:border-[#343332] focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending || !title.trim()}
        className="rounded-full bg-[#343332] px-3.5 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        Add
      </button>
      <button type="button" onClick={onDone} className="px-2 text-sm text-[#6c6a69] hover:text-[#1a1a19]">
        Done
      </button>
      {error && (
        <span role="alert" className="w-full text-xs text-red-700">
          {error}
        </span>
      )}
    </form>
  );
}

interface InlineAddProps {
  label: string;
  placeholder: string;
  onAdd: (title: string) => Promise<string | null>;
}

/** "+ Add …" text button that expands into an InlineAddForm. */
export function InlineAdd({ label, placeholder, onAdd }: InlineAddProps) {
  const [open, setOpen] = useState(false);
  if (open) return <InlineAddForm placeholder={placeholder} onAdd={onAdd} onDone={() => setOpen(false)} />;
  return (
    <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-sm font-medium text-[#1a1a19] hover:underline">
      <span aria-hidden>+</span> {label}
    </button>
  );
}
