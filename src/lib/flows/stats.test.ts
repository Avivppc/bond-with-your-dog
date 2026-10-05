import { describe, expect, it } from "vitest";
import { flowTotals, percent, statsByStep, stepStats, type MessageRow } from "./stats";

const T = "2026-10-03T12:00:00Z";
const msg = (over: Partial<MessageRow> = {}): MessageRow => ({
  node_id: "e1",
  variant: null,
  status: "sent",
  delivered_at: T,
  opened_at: null,
  clicked_at: null,
  bounced_at: null,
  complained_at: null,
  ...over,
});

describe("stepStats", () => {
  it("rates opens and clicks against delivered emails", () => {
    const s = stepStats([msg({ opened_at: T, clicked_at: T }), msg({ opened_at: T }), msg(), msg({ delivered_at: null, bounced_at: T }), msg({ status: "skipped", delivered_at: null })]);
    expect(s).toMatchObject({ sent: 4, delivered: 3, opened: 2, clicked: 1, bounced: 1, skipped: 1 });
    expect(s.openRate).toBeCloseTo(2 / 3);
    expect(s.clickRate).toBeCloseTo(1 / 3);
  });

  it("is all zeros with nothing sent", () => {
    expect(stepStats([])).toMatchObject({ sent: 0, openRate: 0, clickRate: 0 });
  });
});

describe("statsByStep", () => {
  it("groups by email step and by A/B variant", () => {
    const byStep = statsByStep([msg({ variant: "A", opened_at: T }), msg({ variant: "B" }), msg({ node_id: "e2" })]);
    expect(byStep.get("e1")?.sent).toBe(2);
    expect(byStep.get("e1")?.variants.A.openRate).toBe(1);
    expect(byStep.get("e1")?.variants.B.openRate).toBe(0);
    expect(byStep.get("e2")?.sent).toBe(1);
  });
});

describe("flowTotals", () => {
  it("counts members, conversions and revenue", () => {
    const totals = flowTotals(
      [{ status: "waiting", exit_reason: null }, { status: "exited", exit_reason: "purchased" }, { status: "done", exit_reason: null }, { status: "active", exit_reason: null }],
      [msg()],
      [{ amount_cents: 10320 }],
    );
    expect(totals).toMatchObject({ entered: 4, inFlow: 2, finished: 2, converted: 1, revenueCents: 10320 });
    expect(totals.conversionRate).toBe(0.25);
  });
});

describe("percent", () => {
  it("formats rates", () => {
    expect(percent(0.4231)).toBe("42%");
    expect(percent(0.034)).toBe("3.4%");
    expect(percent(0)).toBe("0%");
  });
});
