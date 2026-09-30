"use client";

import { useState } from "react";

/** Read-only referral link with a copy button (falls back to selecting the text). */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        readOnly
        value={url}
        aria-label="Your referral link"
        onFocus={(e) => e.target.select()}
        className="min-w-0 flex-1 rounded-full border border-[#cde0ea] bg-white px-5 py-3 text-sm font-semibold text-[#243036]"
      />
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 2000);
          } catch {
            setCopied(false);
          }
        }}
        className="rounded-full bg-[#ff8f00] px-6 py-3 text-sm font-bold text-white shadow-sm hover:brightness-95"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
