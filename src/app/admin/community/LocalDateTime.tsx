"use client";

import { useState } from "react";
import { INPUT, LABEL } from "@/app/admin/_components/ui";

function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Date + time in the admin's own timezone; submits an exact ISO timestamp in a hidden field
 * (the server runs in UTC and must not guess the timezone).
 */
export function LocalDateTime({ name, label, defaultValue, required = false }: { name: string; label: string; defaultValue: string | null; required?: boolean }) {
  const [local, setLocal] = useState(() => toLocalInput(defaultValue));
  const iso = local && !Number.isNaN(new Date(local).getTime()) ? new Date(local).toISOString() : "";
  return (
    <label className="flex flex-col gap-1.5">
      <span className={LABEL}>{label}</span>
      <input type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} required={required} className={INPUT} />
      <input type="hidden" name={name} value={iso} />
    </label>
  );
}
