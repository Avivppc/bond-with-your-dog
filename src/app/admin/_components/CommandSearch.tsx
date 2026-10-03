"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { AdminNav } from "@/lib/admin-nav";
import { flattenHits, navHits, SEARCH_MAX_LENGTH, searchTerm, type SearchGroup } from "@/lib/admin-search";
import { adminSearch } from "./search-actions";

const DEBOUNCE_MS = 200;

const noSubscribe = () => () => {};
const shortcutLabel = () => (/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Ctrl K");

/**
 * ⌘K / Ctrl+K: one box for screens, contacts, courses, lessons, moves, pages, offers and flows.
 * Screens match instantly from the nav; the rest arrives from the server as you type.
 */
export function CommandSearch({ nav }: { nav: AdminNav }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<{ term: string; groups: SearchGroup[] } | null>(null);
  const [active, setActive] = useState(0);
  const shortcut = useSyncExternalStore(noSubscribe, shortcutLabel, () => "Ctrl K");
  const trigger = useRef<HTMLButtonElement>(null);
  const latest = useRef(0);
  const term = searchTerm(query);
  const loading = term !== null && remote?.term !== term;

  const flat = useMemo(() => {
    const screens = navHits(nav, query);
    const server = remote && remote.term === term ? remote.groups : [];
    return flattenHits([...(screens.length ? [{ group: "Screens", hits: screens.slice(0, 6) }] : []), ...server]);
  }, [nav, query, remote, term]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || !term) return;
    const ticket = ++latest.current;
    const timer = window.setTimeout(async () => {
      try {
        const groups = await adminSearch(term);
        if (ticket === latest.current) setRemote({ term, groups });
      } catch (error) {
        console.error("[admin-search] request failed", error);
        if (ticket === latest.current) setRemote({ term, groups: [] });
      }
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [open, term]);

  function close() {
    setOpen(false);
    setQuery("");
    setActive(0);
    trigger.current?.focus();
  }

  function go(href: string) {
    close();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (flat.length ? (i + step + flat.length) % flat.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = flat[active];
      if (hit) go(hit.href);
    }
  }

  // Keep the highlighted row visible while arrowing through a long list.
  useEffect(() => {
    document.getElementById(`cmd-hit-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-label="Search everything"
        className="mr-auto flex h-9 items-center gap-2 rounded-full border border-[#e7e6e4] bg-[#f8f8f8] px-3 text-[14px] text-[#9b9997] hover:bg-white sm:w-full sm:max-w-sm"
      >
        <span className="material-symbols-outlined text-[18px]" aria-hidden>
          search
        </span>
        <span className="hidden flex-1 text-left sm:inline">Search everything</span>
        <kbd className="hidden rounded-[6px] border border-[#e7e6e4] bg-white px-1.5 font-sans text-[12px] text-[#6c6a69] sm:inline">{shortcut}</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && close()}>
          <div role="dialog" aria-modal="true" aria-label="Search" onKeyDown={onKeyDown} className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-[14px] bg-white shadow-[0_16px_48px_rgba(0,0,0,0.2)]">
            <label className="flex items-center gap-2 border-b border-[#efeeed] px-4">
              <span className="material-symbols-outlined text-[20px] text-[#9b9997]" aria-hidden>
                search
              </span>
              <span className="sr-only">Search</span>
              <input
                autoFocus
                value={query}
                maxLength={SEARCH_MAX_LENGTH}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                placeholder="Search contacts, lessons, pages, screens…"
                className="h-14 flex-1 bg-transparent text-[16px] text-[#1a1a19] placeholder:text-[#9b9997] focus:outline-none"
              />
              {loading && <span className="text-[12px] text-[#9b9997]">Searching…</span>}
            </label>

            <ul className="overflow-y-auto py-2" aria-label="Results">
              {query.trim() === "" && <li className="px-4 py-3 text-[14px] text-[#6c6a69]">Type a name, an email, a lesson or a screen.</li>}
              {query.trim() !== "" && flat.length === 0 && !loading && <li className="px-4 py-3 text-[14px] text-[#6c6a69]">Nothing found for &quot;{query.trim()}&quot;.</li>}
              {flat.map((hit) => (
                <li key={`${hit.group}-${hit.href}`}>
                  {(hit.index === 0 || flat[hit.index - 1].group !== hit.group) && (
                    <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-[#9b9997]">{hit.group}</p>
                  )}
                  <button
                    id={`cmd-hit-${hit.index}`}
                    type="button"
                    onClick={() => go(hit.href)}
                    onMouseMove={() => setActive(hit.index)}
                    aria-current={hit.index === active ? "true" : undefined}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left ${hit.index === active ? "bg-[#f3f3f2]" : ""}`}
                  >
                    <span className="material-symbols-outlined text-[20px] text-[#6c6a69]" aria-hidden>
                      {hit.icon}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] text-[#1a1a19]">{hit.label}</span>
                      {hit.detail && <span className="block truncate text-[12px] text-[#6c6a69]">{hit.detail}</span>}
                    </span>
                    {hit.index === active && (
                      <span className="material-symbols-outlined text-[18px] text-[#9b9997]" aria-hidden>
                        keyboard_return
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <p className="border-t border-[#efeeed] px-4 py-2 text-[12px] text-[#9b9997]">↑↓ to move · Enter to open · Esc to close</p>
          </div>
        </div>
      )}
    </>
  );
}
