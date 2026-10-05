"use client";

import { useId } from "react";
import { MUTED } from "./ui";

export type EmailConsent = "marketing" | "all";

const OPTIONS: { value: EmailConsent; label: string; hint: string }[] = [
  {
    value: "marketing",
    label: "Only people who agreed to marketing emails",
    hint: "For offers, discounts and news. Required by law for anything that promotes.",
  },
  {
    value: "all",
    label: "Everyone, except people who unsubscribed",
    hint: "Only for service messages: Roni replied, a purchase, an account update. Don't use it to sell.",
  },
];

/** Who a flow or campaign may email. Unsubscribed people never get anything either way. */
export function ConsentChoice({ value, onChange }: { value: EmailConsent; onChange: (v: EmailConsent) => void }) {
  const name = useId();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-[14px] font-medium text-[#1a1a19]">Who gets these emails</legend>
      {OPTIONS.map((o) => (
        <label key={o.value} className="flex items-start gap-2 text-[14px]">
          <input type="radio" name={name} className="mt-1 h-4 w-4 accent-[#343332]" checked={value === o.value} onChange={() => onChange(o.value)} />
          <span>
            {o.label}
            <span className={`block text-[12px] ${MUTED}`}>{o.hint}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}
