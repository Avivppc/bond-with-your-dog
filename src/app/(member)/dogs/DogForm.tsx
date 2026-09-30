"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteDog, saveDog } from "@/app/(member)/member-actions";
import { PhotoDrop } from "@/components/app/PhotoDrop";
import { Ms } from "@/components/app/ui";
import { AGE_GROUPS, LIMITATIONS } from "@/lib/member/schemas";

type AgeGroup = "puppy" | "adult" | "senior";
type Size = "small" | "medium" | "large";
type Limitation = "joints" | "injury" | "other";

export interface DogFormValues {
  id?: string;
  name: string;
  breed: string;
  ageGroup: AgeGroup;
  size: Size | null;
  limitations: Limitation[];
  limitationNote: string;
  photoUrl: string | null;
}

const SIZES: { key: Size; label: string }[] = [
  { key: "small", label: "Small" },
  { key: "medium", label: "Medium" },
  { key: "large", label: "Large" },
];

/** Add or edit a dog (design: onboarding "Meet your dog" fields + size and a note). */
export function DogForm({ initial, canDelete }: { initial: DogFormValues; canDelete: boolean }) {
  const router = useRouter();
  const [dog, setDog] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const set = (patch: Partial<DogFormValues>) => setDog((d) => ({ ...d, ...patch }));
  const toggle = (l: Limitation) => set({ limitations: dog.limitations.includes(l) ? dog.limitations.filter((x) => x !== l) : [...dog.limitations, l] });

  return (
    <form
      className="card"
      style={{ gap: 22 }}
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveDog({
            id: dog.id,
            name: dog.name,
            breed: dog.breed || undefined,
            ageGroup: dog.ageGroup,
            size: dog.size,
            limitations: dog.limitations,
            limitationNote: dog.limitationNote || undefined,
            photoUrl: dog.photoUrl,
          });
          if (!res.ok) return setError(res.error);
          router.push("/dogs");
        });
      }}
    >
      <PhotoDrop kind="dog" value={dog.photoUrl} onChange={(url) => set({ photoUrl: url })} size={104} label="A photo helps Roni put a face to the name" />
      <div className="grid-2" style={{ gap: 16 }}>
        <div className="field">
          <label htmlFor="d-name">Dog&apos;s name</label>
          <input id="d-name" className="input" value={dog.name} maxLength={40} required onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="d-breed">Breed</label>
          <input id="d-breed" className="input" value={dog.breed} maxLength={80} placeholder="e.g. Border Collie, mixed" onChange={(e) => set({ breed: e.target.value })} />
        </div>
      </div>
      <div className="field">
        <span className="label">Age</span>
        <div className="seg" role="radiogroup" aria-label="Age">
          {AGE_GROUPS.map((a) => (
            <button key={a.key} type="button" role="radio" aria-checked={dog.ageGroup === a.key} className={dog.ageGroup === a.key ? "on" : undefined} onClick={() => set({ ageGroup: a.key })}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label">Size</span>
        <div className="seg" role="radiogroup" aria-label="Size">
          {SIZES.map((s) => (
            <button key={s.key} type="button" role="radio" aria-checked={dog.size === s.key} className={dog.size === s.key ? "on" : undefined} onClick={() => set({ size: dog.size === s.key ? null : s.key })}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label">Any physical limitations?</span>
        <div className="row">
          <button type="button" className={`chip ${dog.limitations.length === 0 ? "on" : ""}`} aria-pressed={dog.limitations.length === 0} onClick={() => set({ limitations: [] })}>
            None
          </button>
          {LIMITATIONS.map((l) => (
            <button key={l.key} type="button" className={`chip ${dog.limitations.includes(l.key) ? "on" : ""}`} aria-pressed={dog.limitations.includes(l.key)} onClick={() => toggle(l.key)}>
              {l.label}
            </button>
          ))}
        </div>
        {dog.limitations.length > 0 && (
          <input className="input" value={dog.limitationNote} maxLength={200} placeholder="A short note, e.g. recovering from a paw injury" aria-label="Limitation note" onChange={(e) => set({ limitationNote: e.target.value })} />
        )}
        <span className="faint">Moves that load the joints show a gentler alternative first.</span>
      </div>
      {error && (
        <p role="alert" className="faint" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
      <div className="between" style={{ alignItems: "center" }}>
        {canDelete && dog.id ? (
          confirming ? (
            <span className="row">
              <span className="faint">Remove {dog.name} and their progress?</span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
                Keep
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await deleteDog(dog.id!);
                    if (!res.ok) return setError(res.error);
                    router.push("/dogs");
                  })
                }
              >
                Remove
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirming(true)}>
              <Ms name="delete" size="sm" />
              Remove dog
            </button>
          )
        ) : (
          <span />
        )}
        <button className="btn btn-primary" type="submit" disabled={pending || !dog.name.trim()}>
          {pending ? "Saving…" : dog.id ? "Save changes" : "Add dog"}
        </button>
      </div>
    </form>
  );
}
