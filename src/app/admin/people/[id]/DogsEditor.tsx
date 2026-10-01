"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AGE_GROUPS, LIMITATIONS } from "@/lib/member/schemas";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT, LABEL } from "../../_components/ui";
import { deleteMemberDog, saveMemberDog } from "./answers-actions";

type AgeGroup = (typeof AGE_GROUPS)[number]["key"];
type Limitation = (typeof LIMITATIONS)[number]["key"];
type Size = "small" | "medium" | "large";

export interface AdminDog {
  id: string;
  name: string;
  breed: string | null;
  age_group: string | null;
  size: string | null;
  limitations: string[] | null;
  limitation_note: string | null;
}

interface Draft {
  id?: string;
  name: string;
  breed: string;
  ageGroup: AgeGroup;
  size: Size | "";
  limitations: Limitation[];
  limitationNote: string;
}

const EMPTY: Draft = { name: "", breed: "", ageGroup: "adult", size: "", limitations: [], limitationNote: "" };

function draftOf(d: AdminDog): Draft {
  return {
    id: d.id,
    name: d.name,
    breed: d.breed ?? "",
    ageGroup: (AGE_GROUPS.find((a) => a.key === d.age_group)?.key ?? "adult") as AgeGroup,
    size: (["small", "medium", "large"].includes(d.size ?? "") ? d.size : "") as Size | "",
    limitations: (d.limitations ?? []).filter((l): l is Limitation => LIMITATIONS.some((x) => x.key === l)),
    limitationNote: d.limitation_note ?? "",
  };
}

function DogForm({ userId, initial, onDone }: { userId: string; initial: Draft; onDone: () => void }) {
  const router = useRouter();
  const [d, setD] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((prev) => ({ ...prev, [key]: value }));

  function save() {
    setError(null);
    start(async () => {
      const res = await saveMemberDog(userId, { ...d, size: d.size || null });
      if (!res.ok) return setError(res.error);
      onDone();
      router.refresh();
    });
  }

  return (
    <div className="space-y-3 rounded-[12px] border border-[#e7e6e4] p-4">
      {error && <p className="text-[13px] text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-40 flex-1 flex-col gap-1.5">
          <span className={LABEL}>Name</span>
          <input className={INPUT} value={d.name} maxLength={40} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className="flex min-w-40 flex-1 flex-col gap-1.5">
          <span className={LABEL}>Breed</span>
          <input className={INPUT} value={d.breed} maxLength={80} onChange={(e) => set("breed", e.target.value)} />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Age</span>
          <select className={INPUT} value={d.ageGroup} onChange={(e) => set("ageGroup", e.target.value as AgeGroup)}>
            {AGE_GROUPS.map((a) => (
              <option key={a.key} value={a.key}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={LABEL}>Size</span>
          <select className={INPUT} value={d.size} onChange={(e) => set("size", e.target.value as Size | "")}>
            <option value="">Not set</option>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </label>
      </div>
      <fieldset className="space-y-2">
        <legend className={LABEL}>Limitations</legend>
        <div className="flex flex-wrap gap-2">
          {LIMITATIONS.map((l) => (
            <label key={l.key} className="flex items-center gap-1.5 rounded-full border border-[#d9d8d6] px-3 py-1 text-[13px]">
              <input
                type="checkbox"
                checked={d.limitations.includes(l.key)}
                onChange={() => set("limitations", d.limitations.includes(l.key) ? d.limitations.filter((x) => x !== l.key) : [...d.limitations, l.key])}
              />
              {l.label}
            </label>
          ))}
        </div>
        <input className={INPUT} placeholder="Note (optional)" value={d.limitationNote} maxLength={200} onChange={(e) => set("limitationNote", e.target.value)} />
      </fieldset>
      <div className="flex gap-2">
        <button type="button" className={BTN_PRIMARY} onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save dog"}
        </button>
        <button type="button" className={BTN_SECONDARY} onClick={onDone} disabled={pending}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/** Contacts → a member's dogs: add, edit and delete, with the same rules as the member app. */
export function DogsEditor({ userId, dogs }: { userId: string; dogs: AdminDog[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function remove(dog: AdminDog) {
    if (!window.confirm(`Delete ${dog.name}? Their practice history stays, without the dog.`)) return;
    setError(null);
    start(async () => {
      const res = await deleteMemberDog(userId, dog.id);
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="mt-2 space-y-2">
      {error && <p className="text-[13px] text-red-700">{error}</p>}
      {dogs.length === 0 && editing !== "new" && <p className="text-[14px] text-[#6c6a69]">No dogs added yet.</p>}
      {dogs.map((d) =>
        editing === d.id ? (
          <DogForm key={d.id} userId={userId} initial={draftOf(d)} onDone={() => setEditing(null)} />
        ) : (
          <div key={d.id} className="flex flex-wrap items-start justify-between gap-2 rounded-[8px] border border-[#efeeed] px-3 py-2 text-[14px]">
            <div>
              <b>{d.name}</b>
              <span className="text-[#6c6a69]">{[d.breed, AGE_GROUPS.find((a) => a.key === d.age_group)?.label, d.size].filter(Boolean).map((v) => ` · ${v}`).join("")}</span>
              {(d.limitations?.length || d.limitation_note) && (
                <p className="mt-0.5 text-[12px] text-[#8a5a00]">
                  Limitations: {[...(d.limitations ?? []).map((l) => LIMITATIONS.find((x) => x.key === l)?.label ?? l), d.limitation_note].filter(Boolean).join(" — ")}
                </p>
              )}
            </div>
            <div className="flex gap-3 text-[13px]">
              <button type="button" className="font-medium text-[#1a1a19] hover:underline" onClick={() => setEditing(d.id)} disabled={pending}>
                Edit
              </button>
              <button type="button" className="font-medium text-red-700 hover:underline" onClick={() => remove(d)} disabled={pending}>
                Delete
              </button>
            </div>
          </div>
        ),
      )}
      {editing === "new" ? (
        <DogForm userId={userId} initial={EMPTY} onDone={() => setEditing(null)} />
      ) : (
        <button type="button" className={BTN_SECONDARY} onClick={() => setEditing("new")} disabled={pending}>
          Add a dog
        </button>
      )}
    </div>
  );
}
