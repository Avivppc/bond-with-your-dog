"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ms } from "@/components/app/ui";
import { createRoutine } from "./actions";

/** "New routine": name it, then continue in the builder. */
export function NewRoutineForm({ dogId, compact = false }: { dogId: string | null; compact?: boolean }) {
  const [open, setOpen] = useState(!compact);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const inputId = useId();

  if (!open) {
    return (
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        <Ms name="add" size="sm" />
        New routine
      </button>
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const res = await createRoutine({ name, dogId });
      if (res.ok) router.push(`/routine/${res.data.id}`);
      else setError(res.error);
    });
  }

  return (
    <form className="row" onSubmit={submit} style={{ alignItems: "flex-end" }}>
      <div className="field" style={{ flex: 1, minWidth: 220 }}>
        <label htmlFor={inputId}>Routine name</label>
        <input id={inputId} className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Sunday Waltz" required autoFocus={compact} />
      </div>
      <button type="submit" className="btn btn-primary" disabled={pending || !name.trim()}>
        <Ms name="arrow_forward" size="sm" />
        {pending ? "Creating…" : "Create and add music"}
      </button>
      {error && (
        <p className="faint" role="alert" style={{ color: "var(--danger)", width: "100%" }}>
          {error}
        </p>
      )}
    </form>
  );
}
