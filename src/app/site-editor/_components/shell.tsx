"use client";

import Link from "next/link";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { PREVIEW_MESSAGES } from "@/lib/site/preview-messages";
import { STATUS_TEXT, type SaveStatus } from "./use-autosave";

/** The editor's frame: top bar, a left panel and the live preview (desktop or phone width). */

export type Device = "desktop" | "mobile";

export interface PreviewHandle {
  refresh: () => void;
  /** Reload the preview from scratch, keeping the scroll position (after typing on the page). */
  reload: () => void;
  /** Outline a section; scroll to it unless it was clicked in the preview itself. */
  focus: (id: string | null, scroll?: boolean) => void;
}

export interface PreviewEvents {
  onSelect?: (id: string) => void;
  /** "+" between sections in the preview (index to insert at). */
  onInsert?: (index: number) => void;
  /** Undo/redo pressed while the preview had focus. */
  onKey?: (key: "undo" | "redo") => void;
  /** Text typed right on the page. */
  onEdit?: (id: string, path: string, value: string) => void;
  onEditEnd?: () => void;
  /** An image or button clicked on the page: open its field. */
  onFocusField?: (id: string, path: string) => void;
}

interface PreviewProps extends PreviewEvents {
  src: string;
  device: Device;
}

type Incoming = { type?: string; id?: string; index?: number; key?: string; path?: string; value?: string };

export const PreviewFrame = forwardRef<PreviewHandle, PreviewProps>(function PreviewFrame({ src, device, ...events }, ref) {
  const frame = useRef<HTMLIFrameElement>(null);
  const restoreScroll = useRef<number | null>(null);
  const handlers = useRef(events);
  useEffect(() => {
    handlers.current = events;
  });
  const post = (msg: Record<string, unknown>) => frame.current?.contentWindow?.postMessage(msg, window.location.origin);
  useImperativeHandle(ref, () => ({
    refresh: () => post({ type: PREVIEW_MESSAGES.refresh }),
    reload: () => {
      const win = frame.current?.contentWindow;
      if (!win) return;
      restoreScroll.current = win.scrollY;
      win.location.reload();
    },
    focus: (id, scroll = true) => post({ type: PREVIEW_MESSAGES.focus, id, scroll }),
  }));

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      const d = e.data as Incoming;
      const h = handlers.current;
      if (d.type === PREVIEW_MESSAGES.select && d.id) h.onSelect?.(d.id);
      else if (d.type === PREVIEW_MESSAGES.insert && typeof d.index === "number") h.onInsert?.(d.index);
      else if (d.type === PREVIEW_MESSAGES.key && (d.key === "undo" || d.key === "redo")) h.onKey?.(d.key);
      else if (d.type === PREVIEW_MESSAGES.edit && d.id && d.path && typeof d.value === "string") h.onEdit?.(d.id, d.path, d.value);
      else if (d.type === PREVIEW_MESSAGES.editEnd) h.onEditEnd?.();
      else if (d.type === PREVIEW_MESSAGES.focusField && d.id && d.path) h.onFocusField?.(d.id, d.path);
      else if (d.type === PREVIEW_MESSAGES.ready && restoreScroll.current !== null) {
        frame.current?.contentWindow?.scrollTo(0, restoreScroll.current);
        restoreScroll.current = null;
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className="flex h-full justify-center overflow-hidden bg-[#e9e8e6] p-3">
      <iframe
        ref={frame}
        src={src}
        title="Page preview"
        className={`h-full rounded-[10px] border border-[#d9d8d6] bg-white shadow-sm transition-[width] ${device === "mobile" ? "w-[390px]" : "w-full"}`}
      />
    </div>
  );
});

const STATUS_TONE: Record<SaveStatus, string> = {
  saved: "text-[#6c6a69]",
  unsaved: "text-[#6c6a69]",
  saving: "text-[#6c6a69]",
  error: "text-[#a4262c]",
  conflict: "text-[#a4262c]",
};

interface ShellProps {
  title: ReactNode;
  status: SaveStatus;
  device: Device;
  onDevice: (d: Device) => void;
  actions: ReactNode;
  panel: ReactNode;
  preview: ReactNode;
  notice?: ReactNode;
}

export function EditorShell({ title, status, device, onDevice, actions, panel, preview, notice }: ShellProps) {
  const [panelOpen, setPanelOpen] = useState(true);
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#f8f8f8] font-sans text-[#1a1a19]">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[#e7e6e4] bg-white px-3">
        <Link href="/admin/website" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#f3f3f2]" aria-label="Back to Website">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </Link>
        <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-[#f3f3f2] md:hidden" onClick={() => setPanelOpen((o) => !o)} aria-label="Show or hide the panel">
          <span className="material-symbols-outlined text-[20px]">{panelOpen ? "visibility" : "tune"}</span>
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[14px] font-medium">{title}</h1>
        <span className={`hidden text-[12px] sm:inline ${STATUS_TONE[status]}`} role="status">
          {STATUS_TEXT[status]}
        </span>
        <div className="hidden items-center rounded-full border border-[#d9d8d6] p-0.5 md:flex" role="group" aria-label="Preview size">
          {(["desktop", "mobile"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDevice(d)}
              aria-pressed={device === d}
              className={`flex h-7 w-8 items-center justify-center rounded-full ${device === d ? "bg-[#343332] text-white" : "text-[#6c6a69] hover:bg-[#f3f3f2]"}`}
              aria-label={d === "desktop" ? "Desktop preview" : "Phone preview"}
            >
              <span className="material-symbols-outlined text-[18px]">{d === "desktop" ? "desktop_windows" : "smartphone"}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </header>
      {notice}
      <div className="flex min-h-0 flex-1">
        <aside className={`${panelOpen ? "flex" : "hidden"} w-full shrink-0 flex-col overflow-y-auto border-r border-[#e7e6e4] bg-white md:flex md:w-[380px]`}>{panel}</aside>
        <section className={`${panelOpen ? "hidden md:block" : "block"} min-w-0 flex-1`}>{preview}</section>
      </div>
    </div>
  );
}

export function PanelHeader({ title, onBack, children }: { title: string; onBack?: () => void; children?: ReactNode }) {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-[#efeeed] bg-white px-3 py-3">
      {onBack && (
        <button type="button" onClick={onBack} className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-[#f3f3f2]" aria-label="Back">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
        </button>
      )}
      <h2 className="min-w-0 flex-1 truncate text-[14px] font-semibold">{title}</h2>
      {children}
    </div>
  );
}
