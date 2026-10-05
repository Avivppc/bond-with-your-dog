"use client";

import { useEffect, useState } from "react";
import { BTN_PRIMARY, INPUT } from "../_components/ui";
import { bulkContacts } from "./bulk-actions";

export const BULK_FORM_ID = "bulk-contacts";
const ROW_BOXES = `input[form="${BULK_FORM_ID}"][name="ids"]`;

function rowBoxes(): HTMLInputElement[] {
  return [...document.querySelectorAll<HTMLInputElement>(ROW_BOXES)];
}

/** The header checkbox: selects every contact on this page. */
export function SelectAllBox() {
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    const sync = () => {
      const boxes = rowBoxes();
      setChecked(boxes.length > 0 && boxes.every((b) => b.checked));
    };
    document.addEventListener("change", sync);
    return () => document.removeEventListener("change", sync);
  }, []);
  return (
    <input
      type="checkbox"
      aria-label="Select all contacts on this page"
      className="h-4 w-4 accent-[#343332]"
      checked={checked}
      onChange={(e) => {
        rowBoxes().forEach((b) => (b.checked = e.target.checked));
        e.target.dispatchEvent(new Event("change", { bubbles: true }));
        setChecked(e.target.checked);
      }}
    />
  );
}

type Action = "tag" | "untag" | "grant";

/**
 * Appears once contacts are ticked: tag them, remove a tag, or give them an offer. The row
 * checkboxes live in the server-rendered table and join this form through their `form` attribute.
 */
export function BulkBar({ offers, returnTo }: { offers: { id: string; title: string }[]; returnTo: string }) {
  const [count, setCount] = useState(0);
  const [action, setAction] = useState<Action>("tag");
  useEffect(() => {
    const sync = () => setCount(rowBoxes().filter((b) => b.checked).length);
    document.addEventListener("change", sync);
    return () => document.removeEventListener("change", sync);
  }, []);

  return (
    <form id={BULK_FORM_ID} action={bulkContacts} hidden={count === 0} className="flex flex-wrap items-end gap-3 border-t border-[#efeeed] bg-[#fafaf9] px-5 py-3 text-[14px]">
      <input type="hidden" name="return_to" value={returnTo} />
      <span className="self-center font-medium">{count} selected</span>
      <label className="flex flex-col gap-1">
        <span className="sr-only">Bulk action</span>
        <select name="action" className={INPUT} value={action} onChange={(e) => setAction(e.target.value as Action)}>
          <option value="tag">Add a tag</option>
          <option value="untag">Remove a tag</option>
          <option value="grant">Give access to an offer</option>
        </select>
      </label>
      {action === "grant" ? (
        <>
          <label className="flex min-w-48 flex-col gap-1">
            <span className="sr-only">Offer</span>
            <select name="offer_id" className={INPUT} required defaultValue="">
              <option value="" disabled>
                Choose an offer
              </option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </label>
          <label className="flex w-32 flex-col gap-1">
            <span className="sr-only">Days of access</span>
            <input name="days" type="number" min={1} max={36500} placeholder="Lifetime" className={INPUT} />
          </label>
        </>
      ) : (
        <label className="flex min-w-48 flex-col gap-1">
          <span className="sr-only">Tag</span>
          <input name="tag" required maxLength={40} placeholder="Tag, e.g. vip" className={INPUT} />
        </label>
      )}
      <button type="submit" className={BTN_PRIMARY}>
        Apply
      </button>
    </form>
  );
}
