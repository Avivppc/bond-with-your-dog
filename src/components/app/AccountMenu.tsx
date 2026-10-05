"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { setActiveDog } from "@/app/(member)/actions";
import { DogFace, type ChipDog } from "./DogChip";
import { Ms } from "./ui";

interface AccountMenuProps {
  name: string;
  email: string;
  initials: string;
  avatarUrl: string | null;
  dogs: ChipDog[];
  activeDogId: string | null;
}

const LINKS = [
  { href: "/profile", icon: "person", label: "Profile" },
  { href: "/settings", icon: "settings", label: "Settings" },
  { href: "/help", icon: "help", label: "Help" },
] as const;

/**
 * The member's picture in the top bar opens this menu: which dog you're training (each keeps its
 * own progress), then Profile, Settings, Help and Sign out. On phones it replaces the dog chip.
 */
export function AccountMenu({ name, email, initials, avatarUrl, dogs, activeDogId }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const wrap = useRef<HTMLDivElement>(null);
  const active = dogs.find((d) => d.id === activeDogId) ?? dogs[0];

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

  return (
    <div className="account-menu-wrap" ref={wrap} data-tour="account-menu">
      <button
        type="button"
        className="avatar-initials account-trigger"
        aria-label="Your account, dogs and settings"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((o) => !o)}
        style={avatarUrl ? { padding: 0, overflow: "hidden" } : undefined}
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- member-uploaded photo
          <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          initials
        )}
      </button>
      {open && (
        <div className="dog-menu account-menu" role="menu">
          <div className="account-menu-head">
            <b>{name}</b>
            <small>{email}</small>
          </div>
          <div className="divider" style={{ margin: "4px 0" }} />
          <span className="account-menu-label">{dogs.length > 1 ? "Training with" : "Your dog"}</span>
          {dogs.map((d) => (
            <button
              key={d.id}
              type="button"
              role="menuitemradio"
              aria-checked={d.id === active?.id}
              onClick={() => {
                setOpen(false);
                if (d.id !== active?.id) start(() => setActiveDog(d.id));
              }}
            >
              <DogFace dog={d} size={36} />
              <span>
                {d.name}
                <small>{d.subtitle}</small>
              </span>
              {d.id === active?.id && <span className="ms check">check</span>}
            </button>
          ))}
          <Link href={dogs.length ? "/dogs" : "/dogs/new"} role="menuitem" onClick={() => setOpen(false)}>
            <span className="ms" style={{ width: 36, textAlign: "center", color: "var(--teal)" }}>
              {dogs.length ? "pets" : "add"}
            </span>
            {dogs.length ? "Manage dogs" : "Add your dog"}
          </Link>
          <div className="divider" style={{ margin: "4px 0" }} />
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} role="menuitem" onClick={() => setOpen(false)}>
              <span className="ms" style={{ width: 36, textAlign: "center" }}>
                {l.icon}
              </span>
              {l.label}
            </Link>
          ))}
          <form action="/auth/logout" method="post">
            <button type="submit" role="menuitem">
              <span className="ms" style={{ width: 36, textAlign: "center" }}>
                logout
              </span>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/** Home on phones: search sits here, since the top bar keeps only the logo, bell and picture. */
export function HomeSearch() {
  return (
    <form action="/search" role="search" className="home-search">
      <label className="search" htmlFor="home-q">
        <Ms name="search" size="sm" />
        <input id="home-q" name="q" type="search" placeholder="Search lessons and notes…" autoComplete="off" maxLength={80} />
      </label>
    </form>
  );
}
