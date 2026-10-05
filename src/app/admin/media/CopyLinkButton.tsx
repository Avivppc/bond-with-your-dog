"use client";

import { useState } from "react";

const COPIED_MS = 1500;

/** Copies an image's public link (to paste into an email, a page or a social post). */
export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), COPIED_MS);
        } catch (err) {
          console.error("copy link failed", err);
        }
      }}
      className="rounded-full border border-[#d9d8d6] bg-white px-2.5 py-0.5 text-[12px] font-medium hover:bg-[#f3f3f2]"
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
