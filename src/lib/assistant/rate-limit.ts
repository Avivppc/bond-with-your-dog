import type { AssistantMode } from "./types";

/** Daily question limits (pure decision; the counts come from assistant_usage()). */

export const RATE_WINDOW_MS = 24 * 60 * 60 * 1000;

export const LIMITS = {
  memberPerDay: 40,
  visitorPerDay: 15,
  ipPerDay: 60,
} as const;

export interface UsageCounts {
  user: number;
  visitor: number;
  ip: number;
}

export type RateDecision = { allowed: true } | { allowed: false; message: string };

const MEMBER_LIMIT_MESSAGE = "You've asked a lot today. Let's pick this up tomorrow, or ask Roni in Help.";
const VISITOR_LIMIT_MESSAGE = "That's all the questions we can answer here today. Take the free quiz at /quiz, or come back tomorrow.";

export function rateLimitDecision(mode: AssistantMode, counts: UsageCounts): RateDecision {
  if (mode === "member") {
    return counts.user >= LIMITS.memberPerDay ? { allowed: false, message: MEMBER_LIMIT_MESSAGE } : { allowed: true };
  }
  const blocked = counts.visitor >= LIMITS.visitorPerDay || counts.ip >= LIMITS.ipPerDay;
  return blocked ? { allowed: false, message: VISITOR_LIMIT_MESSAGE } : { allowed: true };
}

export function windowStart(now: Date): Date {
  return new Date(now.getTime() - RATE_WINDOW_MS);
}
