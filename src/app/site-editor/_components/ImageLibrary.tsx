"use client";

import { useEffect, useState } from "react";
import { SITE_IMAGE_GROUPS } from "@/lib/site/site-images";
import { INPUT } from "@/app/admin/_components/ui";
import { listSiteUploads, uploadSiteImage, type UploadedImage } from "../actions";

type Tab = "uploads" | string;

/** Pick an image: one uploaded earlier, a site photo or sketch, or upload a new one. */
export function ImageLibrary({ onPick, onClose }: { onPick: (src: string) => void; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("uploads");
  const [uploads, setUploads] = useState<UploadedImage[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSiteUploads().then(setUploads, () => setUploads([]));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const result = await uploadSiteImage(form).catch(() => ({ error: "The upload didn't go through. Try again." }));
    setBusy(false);
    if ("error" in result) return setError(result.error);
    onPick(result.url);
  }

  const images =
    tab === "uploads"
      ? (uploads ?? []).map((u) => ({ src: u.src, name: u.name }))
      : (SITE_IMAGE_GROUPS.find((g) => g.label === tab)?.images ?? []);
  const shown = images.filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Image library" onClick={onClose}>
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-[12px] bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-[#efeeed] px-4 py-3">
          <h2 className="flex-1 text-[15px] font-semibold">Choose an image</h2>
          <label className="cursor-pointer rounded-full bg-[#343332] px-3 py-1.5 text-[13px] font-medium text-white hover:bg-[#1a1a19]">
            {busy ? "Uploading…" : "Upload new"}
            <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" disabled={busy} onChange={(e) => upload(e.target.files?.[0])} />
          </label>
          <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#f3f3f2]" aria-label="Close">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-[#efeeed] px-4 py-2">
          {["uploads", ...SITE_IMAGE_GROUPS.map((g) => g.label)].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={`rounded-full px-3 py-1 text-[13px] ${tab === t ? "bg-[#343332] text-white" : "border border-[#d9d8d6] hover:bg-[#f3f3f2]"}`}
            >
              {t === "uploads" ? "Your uploads" : t}
            </button>
          ))}
          <input className={`${INPUT} ml-auto max-w-48 py-1 text-[13px]`} placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search images" />
        </div>
        {error && <p className="px-4 pt-2 text-[13px] text-red-700">{error}</p>}
        <div className="min-h-48 overflow-y-auto p-4">
          {tab === "uploads" && uploads === null ? (
            <p className="text-[13px] text-[#6c6a69]">Loading…</p>
          ) : shown.length === 0 ? (
            <p className="text-[13px] text-[#6c6a69]">{tab === "uploads" ? "Nothing uploaded yet. Use Upload new, or pick a site photo." : "No images match."}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {shown.map((i) => (
                <li key={i.src}>
                  <button type="button" onClick={() => onPick(i.src)} className="group block w-full overflow-hidden rounded-[8px] border border-[#e7e6e4] text-left hover:border-[#343332]">
                    {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails of site images and uploads */}
                    <img src={i.src} alt="" loading="lazy" className="aspect-[4/3] w-full bg-[#f8f8f8] object-cover" />
                    <span className="block truncate px-2 py-1 text-[11px] text-[#6c6a69]">{i.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
