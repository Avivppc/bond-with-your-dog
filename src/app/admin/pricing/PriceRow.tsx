"use client";

import { useActionState } from "react";
import { BTN_PRIMARY, INPUT, MUTED } from "../_components/ui";
import { saveChapterPrice, type PriceFormState } from "./actions";

interface PriceRowProps {
  courseId: string;
  title: string;
  chapterNumber: number;
  /** Current price in dollars ("129"), or "" when the chapter has no price yet. */
  price: string;
  status: "published" | "draft";
  coursePublished: boolean;
}

/** One chapter: its price in dollars and whether it's on sale. */
export function PriceRow({ courseId, title, chapterNumber, price, status, coursePublished }: PriceRowProps) {
  const [state, action, pending] = useActionState<PriceFormState, FormData>(saveChapterPrice, { ok: true, message: "" });
  return (
    <form action={action} className="flex flex-wrap items-end gap-4 border-b border-[#efeeed] px-5 py-4 last:border-0">
      <input type="hidden" name="courseId" value={courseId} />
      <div className="min-w-[200px] flex-1">
        <p className={`text-[12px] ${MUTED}`}>Chapter {chapterNumber}</p>
        <p className="font-medium text-[#1a1a19]">{title}</p>
        {!coursePublished && <p className="text-[12px] text-[#8a5a00]">The chapter itself isn&apos;t published yet, so members can&apos;t buy it.</p>}
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-[12px] text-[#6c6a69]">Price (USD)</span>
        <span className="flex items-center gap-1">
          <span className="text-[#6c6a69]">$</span>
          <input name="price" inputMode="decimal" defaultValue={price} placeholder="129" className={`${INPUT} w-28`} required />
        </span>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[12px] text-[#6c6a69]">On sale</span>
        <select name="status" defaultValue={status} className={`${INPUT} w-36`}>
          <option value="published">Yes</option>
          <option value="draft">Not yet</option>
        </select>
      </label>
      <button type="submit" className={BTN_PRIMARY} disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
      {state.message && (
        <p role="status" className={`w-full text-[13px] ${state.ok ? "text-[#1c6b35]" : "text-[#a4262c]"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
