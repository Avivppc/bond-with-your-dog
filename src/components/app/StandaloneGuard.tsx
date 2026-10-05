"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

/**
 * The installed app is the member area: when it lands on the website's front page (the logo link,
 * signing out to "/"), it goes to /home instead. Other website pages stay reachable on purpose:
 * Android opens every bonded.dog link in the installed app (an email's "unsubscribe", a shared
 * story), and those must still work. In a normal browser tab this does nothing.
 */
export function StandaloneGuard() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname === "/" && isStandalone()) window.location.replace("/home");
  }, [pathname]);
  return null;
}
