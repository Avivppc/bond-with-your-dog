"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import { markTourSeen } from "@/app/(member)/member-actions";
import { TOURS, visibleSteps } from "./tours";

const START_DELAY_MS = 600;

/**
 * Runs a screen's walkthrough the first time a member lands there (or on ?tour=<id>), and
 * remembers it in profiles.tours_seen so it doesn't come back.
 */
export function GuidedTour({ seen, onboarded }: { seen: string[]; onboarded: boolean }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const started = useRef<string | null>(null);
  const forced = params.get("tour");

  useEffect(() => {
    const tour = TOURS.find((t) => t.matches(pathname));
    if (!tour || !onboarded) return;
    if (seen.includes(tour.id) && forced !== tour.id) return;
    if (started.current === `${tour.id}:${pathname}`) return;

    const timer = window.setTimeout(() => {
      const steps = visibleSteps(tour.steps, (t) => document.querySelector(`[data-tour="${t}"]`));
      if (steps.length === 0) return;
      started.current = `${tour.id}:${pathname}`;
      const d = driver({
        showProgress: true,
        progressText: "{{current}} of {{total}}",
        nextBtnText: "Next",
        prevBtnText: "Back",
        doneBtnText: "Got it",
        popoverClass: "bonded-tour",
        overlayColor: "rgba(36, 48, 54, 0.55)",
        stagePadding: 6,
        stageRadius: 18,
        steps: steps.map((s) => ({ element: `[data-tour="${s.target}"]`, popover: { title: s.title, description: s.body } })),
        onDestroyed: () => {
          void markTourSeen(tour.id);
          if (forced) router.replace(pathname, { scroll: false });
        },
      });
      d.drive();
    }, START_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [pathname, forced, seen, onboarded, router]);

  return null;
}
