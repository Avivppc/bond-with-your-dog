/**
 * Flow numbers as email tools show them: per email step (sent, delivered, open and click rates,
 * split by A/B variant) and for the whole flow (entered, converted, revenue). Pure.
 */

export interface MessageRow {
  node_id: string | null;
  variant: string | null;
  status: "sent" | "failed" | "skipped";
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  bounced_at: string | null;
  complained_at: string | null;
}

export interface StepStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  skipped: number;
  failed: number;
  /** Opens / delivered (sent when delivery isn't reported yet), 0–1. */
  openRate: number;
  clickRate: number;
}

const EMPTY: StepStats = { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, skipped: 0, failed: 0, openRate: 0, clickRate: 0 };

export function stepStats(messages: readonly MessageRow[]): StepStats {
  const sent = messages.filter((m) => m.status === "sent");
  const delivered = sent.filter((m) => m.delivered_at).length;
  const opened = sent.filter((m) => m.opened_at).length;
  const clicked = sent.filter((m) => m.clicked_at).length;
  const base = delivered || sent.length;
  return {
    sent: sent.length,
    delivered,
    opened,
    clicked,
    bounced: sent.filter((m) => m.bounced_at).length,
    skipped: messages.filter((m) => m.status === "skipped").length,
    failed: messages.filter((m) => m.status === "failed").length,
    openRate: base ? opened / base : 0,
    clickRate: base ? clicked / base : 0,
  };
}

/** Stats per email step, and per variant inside a step ("A"/"B") when an A/B split leads to it. */
export function statsByStep(messages: readonly MessageRow[]): Map<string, StepStats & { variants: Record<string, StepStats> }> {
  const byNode = new Map<string, MessageRow[]>();
  for (const m of messages) {
    if (!m.node_id) continue;
    byNode.set(m.node_id, [...(byNode.get(m.node_id) ?? []), m]);
  }
  return new Map(
    [...byNode].map(([node, rows]) => {
      const variants: Record<string, StepStats> = {};
      for (const v of new Set(rows.map((r) => r.variant).filter((v): v is string => Boolean(v)))) variants[v] = stepStats(rows.filter((r) => r.variant === v));
      return [node, { ...stepStats(rows), variants }];
    }),
  );
}

export interface RunRow {
  status: "active" | "waiting" | "done" | "exited";
  exit_reason: string | null;
}

export interface FlowTotals {
  entered: number;
  inFlow: number;
  finished: number;
  converted: number;
  conversionRate: number;
  revenueCents: number;
  emails: StepStats;
}

/** `conversions` = paid orders for the chapter the flow sells, made by members after they entered it. */
export function flowTotals(runs: readonly RunRow[], messages: readonly MessageRow[], conversions: readonly { amount_cents: number }[]): FlowTotals {
  return {
    entered: runs.length,
    inFlow: runs.filter((r) => r.status === "active" || r.status === "waiting").length,
    finished: runs.filter((r) => r.status === "done" || r.status === "exited").length,
    converted: conversions.length,
    conversionRate: runs.length ? conversions.length / runs.length : 0,
    revenueCents: conversions.reduce((sum, c) => sum + c.amount_cents, 0),
    emails: stepStats(messages),
  };
}

export const EMPTY_STATS = EMPTY;

export function percent(rate: number): string {
  return `${(rate * 100).toFixed(rate > 0 && rate < 0.1 ? 1 : 0)}%`;
}
