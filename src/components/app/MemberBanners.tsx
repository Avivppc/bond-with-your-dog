"use client";

import Link from "next/link";
import { useSyncExternalStore, useState } from "react";
import type { MemberBanner } from "@/lib/member-area/settings";
import { Ms } from "./ui";

const TONE: Record<MemberBanner["tone"], { bg: string; fg: string; icon: string }> = {
  info: { bg: "var(--teal-soft)", fg: "var(--teal)", icon: "campaign" },
  promo: { bg: "var(--orange-soft)", fg: "var(--cognac)", icon: "local_offer" },
  gold: { bg: "var(--gold-soft)", fg: "var(--gold-ink)", icon: "event" },
};

const key = (id: string) => `bonded-banner-closed:${id}`;

function wasClosed(id: string): boolean {
  try {
    return window.localStorage.getItem(key(id)) === "1";
  } catch {
    return false;
  }
}

const subscribe = () => () => {};

/** Announcement banners from Website → Member area, at the top of every member page. */
export function MemberBanners({ banners }: { banners: MemberBanner[] }) {
  // Closed banners are remembered on this device; the server render shows them all.
  const inBrowser = useSyncExternalStore(subscribe, () => true, () => false);
  const [closed, setClosed] = useState<string[]>([]);
  const shown = banners.filter((b) => !closed.includes(b.id) && !(inBrowser && b.dismissible && wasClosed(b.id)));
  if (shown.length === 0) return null;
  return (
    <div style={{ display: "grid", gap: 10, marginBottom: 18 }}>
      {shown.map((b) => {
        const tone = TONE[b.tone];
        const external = /^(https?:|mailto:)/.test(b.link.href);
        return (
          <div key={b.id} role="status" style={{ background: tone.bg, color: tone.fg, borderRadius: "var(--r-md)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <Ms name={tone.icon} />
            <span style={{ flex: 1, minWidth: 180, fontWeight: 600 }}>{b.text}</span>
            {b.link.label && b.link.href && (
              external ? (
                <a href={b.link.href} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 700, textDecoration: "underline", color: "inherit" }}>
                  {b.link.label}
                </a>
              ) : (
                <Link href={b.link.href} style={{ fontWeight: 700, textDecoration: "underline", color: "inherit" }}>
                  {b.link.label}
                </Link>
              )
            )}
            {b.dismissible && (
              <button
                type="button"
                aria-label="Close"
                onClick={() => {
                  try {
                    window.localStorage.setItem(key(b.id), "1");
                  } catch {
                    // Private mode: it just closes for now.
                  }
                  setClosed((c) => [...c, b.id]);
                }}
                style={{ background: "transparent", border: 0, color: "inherit", cursor: "pointer", display: "flex" }}
              >
                <Ms name="close" size="sm" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
