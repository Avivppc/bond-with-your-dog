"use client";

import { useState } from "react";
import { Ms } from "./ui";

/** Copies a value (absolute URL when given a path) and confirms inline. */
export function CopyButton({ value, label, className = "btn btn-ghost btn-sm" }: { value: string; label: string; className?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        const text = value.startsWith("/") ? `${window.location.origin}${value}` : value;
        try {
          await navigator.clipboard.writeText(text);
          setState("copied");
        } catch {
          setState("failed");
        }
        setTimeout(() => setState("idle"), 2400);
      }}
    >
      <Ms name={state === "copied" ? "check" : "link"} size="sm" />
      {state === "copied" ? "Link copied" : state === "failed" ? "Copy failed" : label}
    </button>
  );
}
