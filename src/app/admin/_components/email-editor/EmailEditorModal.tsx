"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { EmailDoc } from "@/lib/email-blocks/types";
import { BTN_PRIMARY, BTN_SECONDARY } from "../ui";
import { EmailEditor, type EmailEditorProps } from "./EmailEditor";

/**
 * The editor in a full-screen dialog. It edits a local draft; Save hands the draft to onSave
 * (the caller closes the modal, e.g. by setting open=false), Cancel / Escape discard it (asking
 * first when there are unsaved changes). Focus stays inside the dialog and returns afterwards.
 */

export interface EmailEditorModalProps extends Omit<EmailEditorProps, "value" | "onChange"> {
  open: boolean;
  title: string;
  value: EmailDoc;
  onClose: () => void;
  onSave: (doc: EmailDoc) => void | Promise<void>;
  saveLabel?: string;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), select:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
const DISCARD_PROMPT = "Discard your changes to this email?";

export function EmailEditorModal(props: EmailEditorModalProps) {
  if (!props.open) return null;
  return <ModalContent {...props} />;
}

function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
}

/** Keeps Tab / Shift+Tab cycling inside the dialog. */
function trapTab(e: React.KeyboardEvent<HTMLElement>) {
  const items = focusables(e.currentTarget);
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === e.currentTarget)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

function ModalContent({ title, value, onClose, onSave, saveLabel = "Save email", ...editorProps }: EmailEditorModalProps) {
  const [draft, setDraft] = useState<EmailDoc>(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);

  function requestClose() {
    if (saving) return;
    const dirty = JSON.stringify(draft) !== JSON.stringify(value);
    if (dirty && !window.confirm(DISCARD_PROMPT)) return;
    onClose();
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not save the email. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      requestClose();
    } else if (e.key === "Tab") {
      trapTab(e);
    }
  }

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-50 flex flex-col bg-[#f8f8f8] focus:outline-none"
    >
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#e7e6e4] bg-white px-4 py-3 sm:px-6">
        <h2 id={titleId} className="min-w-0 truncate text-lg font-semibold text-[#1a1a19]">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          {error && (
            <p role="alert" className="max-w-xs text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="button" className={BTN_SECONDARY} onClick={requestClose} disabled={saving}>
            Cancel
          </button>
          <button type="button" className={BTN_PRIMARY} onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : saveLabel}
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1440px] bg-white px-4 py-5 sm:px-6 lg:my-4 lg:rounded-[12px] lg:border lg:border-[#e7e6e4]">
          <EmailEditor {...editorProps} value={draft} onChange={setDraft} />
        </div>
      </div>
    </div>
  );
}
