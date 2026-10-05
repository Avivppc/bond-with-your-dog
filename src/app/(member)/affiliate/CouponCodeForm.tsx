"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMyCouponCode } from "./actions";

interface CouponCodeFormProps {
  suggestion: string;
}

/** Picks the affiliate's discount code (once); the page then shows it with a copy button. */
export function CouponCodeForm({ suggestion }: CouponCodeFormProps) {
  const router = useRouter();
  const [code, setCode] = useState(suggestion);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="stack"
      style={{ gap: 8 }}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await createMyCouponCode(code);
          if (!res.ok) return setError(res.error);
          router.refresh();
        });
      }}
    >
      <div className="row">
        <input
          className="input"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={40}
          required
          aria-label="Your discount code"
          style={{ flex: 1, minWidth: 180, textTransform: "uppercase", fontFamily: "var(--font-mono, monospace)" }}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={pending}>
          {pending ? "Creating…" : "Create my code"}
        </button>
      </div>
      {error && (
        <p role="alert" className="faint" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </form>
  );
}
