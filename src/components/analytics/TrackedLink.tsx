"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { track, type EventName, type EventProps } from "@/lib/analytics";

interface TrackedLinkProps {
  href: string;
  event: EventName;
  props?: EventProps;
  className?: string;
  children: ReactNode;
}

function isExternal(href: string): boolean {
  return /^https?:\/\//.test(href);
}

/**
 * A link that reports its click to PostHog. Clicks that leave the site
 * (e.g. Kajabi checkout) go out as a beacon so the page unload can't drop them.
 */
export default function TrackedLink({ href, event, props, className, children }: TrackedLinkProps) {
  const external = isExternal(href);

  function handleClick() {
    track(event, { ...props, destination: href, is_external: external }, external);
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
