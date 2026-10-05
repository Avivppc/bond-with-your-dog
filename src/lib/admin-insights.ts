import { z } from "zod";

/** Contacts → Insights: the numbers admin_contact_insights() returns, checked before use. */

const count = z.coerce.number().int().nonnegative().catch(0);

export const insightsSchema = z.object({
  contacts: z.object({ total: count, members: count, leads: count, new30: count, newPrev30: count }),
  customers: z.object({ total: count, new30: count, newPrev30: count, active30: count }),
  subscribers: z.object({ total: count, notConsented: count, new30: count }),
  unsubscribed: z.object({ total: count, link30: count, complaint30: count, bounce30: count }),
  engagement: z.object({ healthy: count, atRisk: count, inactive: count }),
});

export type ContactInsights = z.infer<typeof insightsSchema>;

/** "+3 vs the 30 days before", "−2 vs …" or "No change". */
export function trend(current: number, previous: number): string {
  const diff = current - previous;
  if (diff === 0) return "No change vs the 30 days before";
  return `${diff > 0 ? "+" : "−"}${Math.abs(diff)} vs the 30 days before`;
}

/** Whole-number share, "0%" when there's nothing to divide. */
export function share(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%";
}
