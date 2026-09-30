"use client";

import Script from "next/script";
import { useState } from "react";

interface PaddleGlobal {
  Environment: { set: (env: "sandbox" | "production") => void };
  Initialize: (options: {
    token: string;
    checkout?: { settings?: { successUrl?: string; displayMode?: "overlay" | "inline"; theme?: "light" | "dark" } };
  }) => void;
}

interface PaddleCheckoutProps {
  clientToken: string;
  environment: "sandbox" | "production";
  successUrl: string;
}

/**
 * Loads Paddle.js; with `_ptxn` in the URL, Paddle.Initialize opens the overlay
 * checkout for the transaction our server created (custom_data carries the order id).
 */
export function PaddleCheckout({ clientToken, environment, successUrl }: PaddleCheckoutProps) {
  const [failed, setFailed] = useState(false);

  function init() {
    const paddle = (window as unknown as { Paddle?: PaddleGlobal }).Paddle;
    if (!paddle) {
      setFailed(true);
      return;
    }
    if (environment === "sandbox") paddle.Environment.set("sandbox");
    paddle.Initialize({ token: clientToken, checkout: { settings: { successUrl, displayMode: "overlay", theme: "light" } } });
  }

  return (
    <>
      <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="afterInteractive" onLoad={init} onError={() => setFailed(true)} />
      <p role={failed ? "alert" : "status"} className="text-center" style={{ color: "#515d64" }}>
        {failed ? "We couldn't load the secure checkout. Please disable blockers and refresh." : "Opening secure checkout…"}
      </p>
    </>
  );
}
