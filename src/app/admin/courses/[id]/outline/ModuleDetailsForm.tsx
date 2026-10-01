"use client";

import { useState, useTransition } from "react";
import { MAX_MODULE_DESCRIPTION } from "@/lib/content/limits";
import { updateModule } from "../outline-actions";

interface ModuleDetailsFormProps {
  courseId: string;
  moduleId: string;
  title: string;
  description: string | null;
  onDone: () => void;
}

const FIELD = "w-full rounded-[8px] border border-[#d9d8d6] bg-white px-3 py-1.5 text-sm focus:border-[#343332] focus:outline-none";

/** Module ⋯ → Edit details: title and the description members see under the module heading. */
export function ModuleDetailsForm({ courseId, moduleId, title, description, onDone }: ModuleDetailsFormProps) {
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftDescription, setDraftDescription] = useState(description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateModule({ courseId, id: moduleId, title: draftTitle, description: draftDescription });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onDone();
    });
  }

  return (
    <form onSubmit={save} className="space-y-3 px-4 py-3" onKeyDown={(e) => e.key === "Escape" && onDone()}>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-[#6c6a69]">Title</span>
        <input autoFocus required maxLength={200} value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} disabled={pending} className={FIELD} />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-[#6c6a69]">Description (optional)</span>
        <textarea
          rows={3}
          maxLength={MAX_MODULE_DESCRIPTION}
          value={draftDescription}
          onChange={(e) => setDraftDescription(e.target.value)}
          disabled={pending}
          placeholder="What members will learn in this module"
          className={`${FIELD} resize-y`}
        />
        <span className="block text-xs text-[#9b9997]">Shown under the module title on the course page.</span>
      </label>
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending || !draftTitle.trim()} className="rounded-full bg-[#343332] px-3.5 py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onDone} disabled={pending} className="px-2 text-sm text-[#6c6a69] hover:text-[#1a1a19]">
          Cancel
        </button>
        {error && (
          <span role="alert" className="text-xs text-red-700">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
