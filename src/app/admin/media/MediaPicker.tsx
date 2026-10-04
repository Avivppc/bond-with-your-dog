"use client";

import { useEffect, useRef, useState } from "react";
import { BTN_SECONDARY, INPUT } from "../_components/ui";
import type { MediaItem } from "@/lib/media/server";
import { listMediaForPicker } from "./actions";

/** Wait this long after typing before searching. */
const SEARCH_DELAY_MS = 300;

interface MediaPickerProps {
  /** Called with the chosen image's URL; resolve to an error message to keep the dialog open. */
  onPick: (url: string) => Promise<string | null>;
  label?: string;
  disabled?: boolean;
}

/** "Choose from library": a dialog with the media library's images; clicking one picks it. */
export function MediaPicker({ onPick, label = "Choose from library", disabled = false }: MediaPickerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picking, setPicking] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await listMediaForPicker({ search });
      if (cancelled) return;
      if (res.ok) {
        setItems(res.data);
        setError(null);
      } else setError(res.error);
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, search]);

  function show() {
    setOpen(true);
    dialog.current?.showModal();
  }

  function close() {
    dialog.current?.close();
  }

  async function pick(url: string) {
    setPicking(url);
    const problem = await onPick(url);
    setPicking(null);
    if (problem) setError(problem);
    else close();
  }

  return (
    <>
      <button type="button" className={BTN_SECONDARY} onClick={show} disabled={disabled}>
        <span className="material-symbols-outlined text-[18px]" aria-hidden>
          photo_library
        </span>
        {label}
      </button>
      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        className="m-auto w-[min(920px,calc(100vw-32px))] rounded-[14px] border border-[#e7e6e4] p-0 shadow-xl backdrop:bg-black/40"
        aria-label="Media library"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[#efeeed] px-5 py-3">
          <h2 className="text-[16px] font-semibold">Media library</h2>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by file name"
              aria-label="Search images"
              className={`${INPUT} w-52`}
            />
            <button type="button" onClick={close} aria-label="Close" className="rounded-full p-1.5 hover:bg-[#f3f3f2]">
              <span className="material-symbols-outlined text-[20px]" aria-hidden>
                close
              </span>
            </button>
          </div>
        </div>
        <div className="max-h-[65vh] overflow-y-auto p-5">
          {error && (
            <p role="alert" className="mb-3 text-[14px] text-[#b42318]">
              {error}
            </p>
          )}
          {items === null ? (
            <p className="text-[14px] text-[#6c6a69]">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-[14px] text-[#6c6a69]">No images found. Upload them in Website → Media library.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) => (
                <li key={item.url}>
                  <button
                    type="button"
                    onClick={() => void pick(item.url)}
                    disabled={picking !== null}
                    className="group block w-full overflow-hidden rounded-[10px] border border-[#e7e6e4] text-left hover:border-[#343332] disabled:opacity-60"
                  >
                    <span className="block aspect-[4/3] bg-[#f3f3f2]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- library thumbnails */}
                      <img src={item.url} alt={item.name} loading="lazy" className="h-full w-full object-cover" />
                    </span>
                    <span className="block truncate px-2 py-1.5 text-[12px] text-[#6c6a69]">{picking === item.url ? "Using it…" : item.origin}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </dialog>
    </>
  );
}
