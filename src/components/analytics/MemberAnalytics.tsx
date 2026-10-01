"use client";

import { useEffect } from "react";
import { registerMemberContext, type MemberContext } from "@/lib/analytics";

/** Keeps the PostHog context in step with the member app shell (active dog, staff flag). */
export default function MemberAnalytics({ dogId, dogCount, isStaff }: MemberContext) {
  useEffect(() => {
    registerMemberContext({ dogId, dogCount, isStaff });
  }, [dogId, dogCount, isStaff]);

  return null;
}
