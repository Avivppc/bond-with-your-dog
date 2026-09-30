"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MARKETING_CONSENT_COOKIE } from "@/lib/auth/marketing-consent";

interface GoogleButtonProps {
  /** Where to land after the OAuth round-trip. */
  next?: string;
  /** Name of a checkbox in the surrounding form whose value we carry through OAuth. */
  consentInputName?: string;
  label?: string;
}

const CONSENT_COOKIE_MAX_AGE_SECONDS = 10 * 60;

/**
 * "Continue with Google" via Supabase OAuth. Consent for marketing emails is
 * ticked before the redirect, so we stash it in a short-lived cookie that
 * /auth/callback reads once the session exists.
 */
export default function GoogleButton({
  next = "/home",
  consentInputName,
  label = "Continue with Google",
}: GoogleButtonProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsRedirecting(true);
    setError(null);

    if (consentInputName) {
      const checkbox = document.querySelector<HTMLInputElement>(
        `input[name="${consentInputName}"]`
      );
      if (checkbox?.checked) {
        document.cookie = `${MARKETING_CONSENT_COOKIE}=1; max-age=${CONSENT_COOKIE_MAX_AGE_SECONDS}; path=/; samesite=lax`;
      }
    }

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (oauthError) {
      setError("Google sign-in isn't available right now. Please use your email instead.");
      setIsRedirecting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isRedirecting}
        className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-full border border-outline-variant/40 bg-white font-bold text-sm text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-60"
      >
        <GoogleMark />
        {isRedirecting ? "Opening Google…" : label}
      </button>
      {error && <p className="text-sm text-error text-center">{error}</p>}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}
