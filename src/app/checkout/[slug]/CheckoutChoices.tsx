"use client";

import { useState } from "react";
import { formatCents } from "@/lib/sales/pricing";
import { startCheckout } from "../actions";

interface CheckoutChoicesProps {
  slug: string;
  currency: string;
  /** The main offer's price after any discount. */
  mainCents: number;
  /** Hidden fields that carry the applied code / after-purchase offer to the server. */
  code: string | null;
  after: string | null;
  bump: { title: string; headline: string; text: string | null; priceCents: number; listCents: number } | null;
  giftable: boolean;
  isFree: boolean;
}

const INPUT = "w-full px-4 py-3 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-[#8b4b00]/30 focus:outline-none";

/** The parts of the checkout the buyer chooses (bump, gift) and the total that follows them. */
export function CheckoutChoices({ slug, currency, mainCents, code, after, bump, giftable, isFree }: CheckoutChoicesProps) {
  const [withBump, setWithBump] = useState(false);
  const [isGift, setIsGift] = useState(false);
  const total = mainCents + (withBump && bump && !isGift ? bump.priceCents : 0);

  return (
    <form action={startCheckout} className="space-y-5">
      <input type="hidden" name="slug" value={slug} />
      {code && <input type="hidden" name="code" value={code} />}
      {after && <input type="hidden" name="after" value={after} />}

      {bump && !isGift && (
        <label className="block cursor-pointer rounded-xl border-2 border-dashed p-4" style={{ borderColor: "#8b4b00", background: "#fff8f0" }}>
          <span className="flex items-start gap-3">
            <input type="checkbox" name="bump" checked={withBump} onChange={(e) => setWithBump(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#8b4b00]" />
            <span>
              <span className="block font-bold" style={{ color: "#243036" }}>
                {bump.headline} — {formatCents(bump.priceCents, currency)}
                {bump.priceCents < bump.listCents && (
                  <span className="ml-2 text-sm font-normal line-through" style={{ color: "#515d64" }}>
                    {formatCents(bump.listCents, currency)}
                  </span>
                )}
              </span>
              {bump.text && (
                <span className="mt-1 block text-sm" style={{ color: "#515d64" }}>
                  {bump.text}
                </span>
              )}
            </span>
          </span>
        </label>
      )}

      {giftable && (
        <div className="rounded-xl border border-slate-200 p-4">
          <label className="flex cursor-pointer items-center gap-3 font-bold" style={{ color: "#243036" }}>
            <input type="checkbox" name="gift" checked={isGift} onChange={(e) => setIsGift(e.target.checked)} className="h-5 w-5 accent-[#8b4b00]" />
            <span className="material-symbols-outlined text-base" style={{ color: "#8b4b00" }} aria-hidden>
              redeem
            </span>
            This is a gift
          </label>
          {isGift && (
            <div className="mt-4 grid gap-3">
              <p className="text-sm" style={{ color: "#515d64" }}>
                We&apos;ll email them right after payment. They get access with their own account; you don&apos;t.
              </p>
              <input className={INPUT} name="recipient_name" required maxLength={60} placeholder="Their first name" aria-label="Recipient's first name" />
              <input className={INPUT} name="recipient_email" type="email" required maxLength={254} placeholder="Their email" aria-label="Recipient's email" />
              <textarea className={`${INPUT} min-h-20`} name="gift_message" maxLength={500} placeholder="A short message (optional)" aria-label="Gift message" />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-slate-100 pt-5">
        <span>
          <span className="block text-xs font-bold uppercase tracking-widest" style={{ color: "#515d64" }}>
            Total
          </span>
          <span className="text-3xl font-extrabold" style={{ color: "#243036" }}>
            {isFree ? "Free" : formatCents(total, currency)}
          </span>
        </span>
        <button type="submit" className="kinetic-gradient px-6 py-3 rounded-full font-bold shadow-md" style={{ color: "#fff0e6" }}>
          {isFree || total === 0 ? "Get access" : isGift ? "Continue to payment (gift)" : "Continue to payment"}
        </button>
      </div>
    </form>
  );
}
