import { describe, expect, it } from "vitest";
import { bucketFor, planRun, type RunFacts, type RunState } from "./engine";
import { SAMPLE } from "./fixtures.test-data";
import type { FlowGraph } from "./graph";

const NOW = new Date("2026-10-03T12:00:00Z");
const start: RunState = { nodeId: "t", waitUntil: null, lastEmailNodeId: null };
const facts = (over: Partial<RunFacts> = {}): RunFacts => ({ purchased: false, unsubscribed: false, opened: () => false, clicked: () => false, bucket: 0.5, ...over });

describe("planRun", () => {
  it("sends the first email and parks the member in the wait", () => {
    const plan = planRun(SAMPLE, start, facts(), NOW);
    expect(plan.actions).toEqual([{ kind: "send", nodeId: "e1", variant: null }]);
    expect(plan.status).toBe("waiting");
    expect(plan.state).toEqual({ nodeId: "w", waitUntil: "2026-10-05T12:00:00.000Z", lastEmailNodeId: "e1" });
  });

  it("keeps waiting until the wait is over", () => {
    const waiting: RunState = { nodeId: "w", waitUntil: "2026-10-05T12:00:00.000Z", lastEmailNodeId: "e1" };
    expect(planRun(SAMPLE, waiting, facts(), NOW)).toMatchObject({ status: "waiting", actions: [] });
  });

  it("sends the reminder to members who didn't open, then finishes", () => {
    const due: RunState = { nodeId: "w", waitUntil: "2026-10-03T11:00:00.000Z", lastEmailNodeId: "e1" };
    const plan = planRun(SAMPLE, due, facts(), NOW);
    expect(plan.actions).toEqual([{ kind: "send", nodeId: "e2", variant: null }]);
    expect(plan.status).toBe("done");
  });

  it("skips the reminder for members who opened (a click counts as opened)", () => {
    const due: RunState = { nodeId: "w", waitUntil: "2026-10-03T11:00:00.000Z", lastEmailNodeId: "e1" };
    expect(planRun(SAMPLE, due, facts({ clicked: (id) => id === "e1" }), NOW)).toMatchObject({ status: "done", actions: [] });
  });

  it("lets buyers leave at once", () => {
    expect(planRun(SAMPLE, start, facts({ purchased: true }), NOW)).toMatchObject({ status: "exited", exitReason: "purchased", actions: [] });
  });

  it("skips emails for unsubscribed members but keeps their place", () => {
    const plan = planRun(SAMPLE, start, facts({ unsubscribed: true }), NOW);
    expect(plan.actions).toEqual([{ kind: "skip", nodeId: "e1", reason: "unsubscribed" }]);
    expect(plan.status).toBe("waiting");
  });

  it("routes an A/B split by bucket and tags the email with the variant", () => {
    const at = { x: 0, y: 0 };
    const ab: FlowGraph = {
      nodes: [
        { id: "t", type: "trigger", position: at, data: {} },
        { id: "s", type: "split", position: at, data: { percentA: 30 } },
        { id: "a", type: "email", position: at, data: { subject: "A", preheader: "", body: "A", ctaLabel: "" } },
        { id: "b", type: "email", position: at, data: { subject: "B", preheader: "", body: "B", ctaLabel: "" } },
      ],
      edges: [
        { id: "1", source: "t", target: "s" },
        { id: "2", source: "s", target: "a", sourceHandle: "a" },
        { id: "3", source: "s", target: "b", sourceHandle: "b" },
      ],
    };
    expect(planRun(ab, start, facts({ bucket: 0.1 }), NOW).actions).toEqual([{ kind: "send", nodeId: "a", variant: "A" }]);
    expect(planRun(ab, start, facts({ bucket: 0.9 }), NOW).actions).toEqual([{ kind: "send", nodeId: "b", variant: "B" }]);
  });

  it("exits cleanly when the member's step was deleted from the flow", () => {
    expect(planRun(SAMPLE, { ...start, nodeId: "gone" }, facts(), NOW)).toMatchObject({ status: "exited", exitReason: "step_removed" });
  });
});

describe("bucketFor", () => {
  it("is stable and in range", () => {
    const b = bucketFor("run-123");
    expect(b).toBe(bucketFor("run-123"));
    expect(b).toBeGreaterThanOrEqual(0);
    expect(b).toBeLessThan(1);
  });
});
