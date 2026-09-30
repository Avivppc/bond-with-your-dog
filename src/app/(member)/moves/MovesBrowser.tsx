"use client";

import { useMemo, useState } from "react";
import { LevelPill, Pill } from "@/components/app/ui";
import type { SkillLevel } from "@/lib/member/viewer";
import { filterKey, filterMoves, parseMoveFilter, type MoveFilter } from "@/lib/practice/moves";
import type { ChipCourse, MoveView, MovesDog } from "./types";
import { MoveDetail } from "./MoveDetail";

const LEVEL_CHIPS: { key: string; label: string }[] = [
  { key: "learning", label: "Learning" },
  { key: "reliable", label: "Reliable" },
  { key: "performance", label: "Performance-ready" },
];

const STACKED_LAYOUT = "(max-width: 1100px)";
const DETAIL_ID = "move-detail";

/** Keeps ?move= and ?filter= in the address bar without a server round trip. */
function syncUrl(slug: string, filter: MoveFilter) {
  const params = new URLSearchParams();
  params.set("move", slug);
  const key = filterKey(filter);
  if (key !== "all") params.set("filter", key);
  window.history.replaceState(null, "", `/moves?${params.toString()}`);
}

/** Filters, the grid of move cards and the detail panel. */
export function MovesBrowser({ moves, courses, dog, initialSlug, initialFilter }: { moves: MoveView[]; courses: ChipCourse[]; dog: MovesDog | null; initialSlug: string; initialFilter: string | undefined }) {
  const [filter, setFilter] = useState<MoveFilter>(() => parseMoveFilter(initialFilter));
  const [slug, setSlug] = useState(initialSlug);
  const levels = useMemo(() => new Map(moves.flatMap((m) => (m.level ? [[m.id, m.level] as [string, SkillLevel]] : []))), [moves]);
  const shown = filterMoves(moves, filter, levels);
  const selected = moves.find((m) => m.slug === slug) ?? moves[0];

  function pickFilter(next: MoveFilter) {
    setFilter(next);
    syncUrl(selected.slug, next);
  }

  function pickMove(next: string) {
    setSlug(next);
    syncUrl(next, filter);
    // Below 1100px the panel sits under the grid: bring it into view.
    if (window.matchMedia(STACKED_LAYOUT).matches) {
      window.requestAnimationFrame(() => document.getElementById(DETAIL_ID)?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  const chip = (key: string, label: string) => {
    const active = filterKey(filter) === key;
    return (
      <button key={key} type="button" className={`chip ${active ? "on" : ""}`} aria-pressed={active} onClick={() => pickFilter(parseMoveFilter(key))}>
        {label}
      </button>
    );
  };

  return (
    <>
      <div className="row" role="toolbar" aria-label="Filter moves">
        {chip("all", "All")}
        {courses.map((c) => chip(`course:${c.id}`, c.title))}
        {dog && (
          <>
            <span className="vr" style={{ marginInline: 4 }} aria-hidden />
            {LEVEL_CHIPS.map((l) => chip(l.key, l.label))}
          </>
        )}
      </div>
      <div className="grid-main">
        {shown.length === 0 ? (
          <div className="card state-card">
            <span className="eyebrow muted">Nothing here yet</span>
            <p className="faint">
              {filter.kind === "level" ? `No moves at this level for ${dog?.name ?? "your dog"} yet. Mark a move's level in its panel.` : "No published moves in this chapter yet."}
            </p>
            <button type="button" className="link" onClick={() => pickFilter({ kind: "all" })}>
              Show all moves
            </button>
          </div>
        ) : (
          <div className="moves-grid">
            {shown.map((m) => (
              <button key={m.id} type="button" className={`move ${m.id === selected.id ? "sel" : ""}`} aria-pressed={m.id === selected.id} onClick={() => pickMove(m.slug)}>
                <div className="sketch">
                  {/* eslint-disable-next-line @next/next/no-img-element -- move artwork */}
                  <img src={m.image} alt="" />
                </div>
                <b>{m.name}</b>
                <div className="between" style={{ alignItems: "center" }}>
                  <small>{m.courseTitle ?? ""}</small>
                  {m.level ? <LevelPill level={m.level} /> : dog ? <Pill>Not started</Pill> : null}
                </div>
              </button>
            ))}
          </div>
        )}
        <div id={DETAIL_ID} className="sticky" style={{ scrollMarginTop: 90 }}>
          <MoveDetail move={selected} dog={dog} />
        </div>
      </div>
    </>
  );
}
