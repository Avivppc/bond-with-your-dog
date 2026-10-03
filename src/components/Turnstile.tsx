"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile widget. Renders nothing until NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. Inside a
 * <form> it adds the hidden `cf-turnstile-response` field; `onToken` also hands the token to forms
 * that post JSON.
 */

interface TurnstileApi {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileProps {
  onToken?: (token: string | null) => void;
  className?: string;
}

export function Turnstile({ onToken, className }: TurnstileProps) {
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(() => typeof window !== "undefined" && Boolean(window.turnstile));
  const tokenCallback = useRef(onToken);
  useEffect(() => {
    tokenCallback.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!SITE_KEY || !ready || !box.current || !window.turnstile) return;
    const id = window.turnstile.render(box.current, {
      sitekey: SITE_KEY,
      appearance: "interaction-only",
      callback: (token: string) => tokenCallback.current?.(token),
      "expired-callback": () => tokenCallback.current?.(null),
      "error-callback": () => tokenCallback.current?.(null),
    });
    return () => window.turnstile?.remove(id);
  }, [ready]);

  if (!SITE_KEY) return null;
  return (
    <>
      <Script src={SCRIPT_SRC} strategy="afterInteractive" onReady={() => setReady(true)} />
      <div ref={box} className={className} />
    </>
  );
}

/** Whether the widget is in use (forms wait for a token only then). */
export const turnstileOn = Boolean(SITE_KEY);
