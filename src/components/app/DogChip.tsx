"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { setActiveDog } from "@/app/(member)/actions";
import { Ms } from "./ui";

export interface ChipDog {
  id: string;
  name: string;
  subtitle: string;
  photo: string | null;
}

export function DogFace({ dog, size }: { dog: ChipDog; size: number }) {
  if (dog.photo) {
    // eslint-disable-next-line @next/next/no-img-element -- member-uploaded photo
    return <img src={dog.photo} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} />;
  }
  return (
    <span className="avatar-initials" style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden>
      {dog.name.charAt(0).toUpperCase()}
    </span>
  );
}

/** Top-bar chip showing the active dog; the menu switches dogs (each keeps its own progress). */
export function DogChip({ dogs, activeId }: { dogs: ChipDog[]; activeId: string | null }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const wrap = useRef<HTMLDivElement>(null);
  const active = dogs.find((d) => d.id === activeId) ?? dogs[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  if (!active) {
    return (
      <Link className="dog-chip" href="/dogs/new">
        <span className="avatar-initials" style={{ width: 32, height: 32 }} aria-hidden>
          <Ms name="add" size="sm" />
        </span>
        <span className="name">Add your dog</span>
      </Link>
    );
  }

  return (
    <div style={{ position: "relative" }} ref={wrap} data-tour="dog-chip">
      <button type="button" className="dog-chip" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} disabled={pending}>
        <DogFace dog={active} size={32} />
        <span className="name">{active.name}</span>
        <Ms name="expand_more" size="sm" />
      </button>
      {open && (
        <div className="dog-menu" role="menu">
          {dogs.map((d) => (
            <button
              key={d.id}
              type="button"
              role="menuitemradio"
              aria-checked={d.id === active.id}
              onClick={() => {
                setOpen(false);
                if (d.id !== active.id) start(() => setActiveDog(d.id));
              }}
            >
              <DogFace dog={d} size={36} />
              <span>
                {d.name}
                <small>{d.subtitle}</small>
              </span>
              {d.id === active.id && <span className="ms check">check</span>}
            </button>
          ))}
          <div className="divider" style={{ margin: "4px 0" }} />
          <Link href="/dogs" role="menuitem" onClick={() => setOpen(false)}>
            <span className="ms" style={{ width: 36, textAlign: "center", color: "var(--teal)" }}>
              add
            </span>
            Manage dogs
          </Link>
        </div>
      )}
    </div>
  );
}
