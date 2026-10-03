import { describe, expect, it } from "vitest";
import { bucketFor, planRun, type RunFacts, type RunState } from "./engine";
import { SAMPLE } from "./fixtures.test-data";
import type { FlowGraph } from "./graph";

const NOW = new Date("2026-10-03T12:00:00Z");
const start: RunState = { nodeId: "t", waitUntil: null, lastEmailNodeId: null };
const facts = (over: Partial<RunFacts> = {}): RunFacts => ({
  goalReached: false,
  unsubscribed: false,
  recentlyEmailed: false,
  holdUntil: null,
  opened: () => false,
  clicked: () => false,
  condition: () => false,
  bucket: 0.5,
  ...over,
});

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

  it("lets people who reached the goal leave at once", () => {
    expect(planRun(SAMPLE, start, facts({ goalReached: true }), NOW)).toMatchObject({ status: "exited", exitReason: "goal", actions: [] });
  });

  it("holds an email until morning during quiet hours, then sends it", () => {
    const night = planRun(SAMPLE, start, facts({ holdUntil: "2026-10-04T06:00:00.000Z" }), NOW);
    expect(night).toMatchObject({ status: "waiting", actions: [], state: { nodeId: "e1", waitUntil: "2026-10-04T06:00:00.000Z" } });
    const morning = planRun(SAMPLE, night.state, facts(), new Date("2026-10-04T06:05:00Z"));
    expect(morning.actions).toEqual([{ kind: "send", nodeId: "e1", variant: null }]);
    expect(morning.state.nodeId).toBe("w");
  });

  it("skips an email under smart sending but keeps the person moving", () => {
    const plan = planRun(SAMPLE, start, facts({ recentlyEmailed: true }), NOW);
    expect(plan.actions).toEqual([{ kind: "skip", nodeId: "e1", reason: "smart_sending" }]);
    expect(plan.status).toBe("waiting");
  });

  it("answers member-data conditions from the facts", () => {
    const at = { x: 0, y: 0 };
    const graph: FlowGraph = {
      nodes: [
        { id: "t", type: "trigger", position: at, data: {} },
        { id: "c", type: "condition", position: at, data: { check: "owns_chapter", courseId: "bonded-moves" } },
        { id: "yes", type: "exit", position: at, data: {} },
        { id: "no", type: "email", position: at, data: { subject: "S", preheader: "", body: "B", ctaLabel: "" } },
      ],
      edges: [
        { id: "1", source: "t", target: "c" },
        { id: "2", source: "c", target: "yes", sourceHandle: "yes" },
        { id: "3", source: "c", target: "no", sourceHandle: "no" },
      ],
    };
    expect(planRun(graph, start, facts({ condition: (id) => id === "c" }), NOW)).toMatchObject({ status: "done", actions: [] });
    expect(planRun(graph, start, facts(), NOW).actions).toEqual([{ kind: "send", nodeId: "no", variant: null }]);
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

  it("runs action steps for everyone, even without email consent or at night", () => {
    const graph: FlowGraph = {
      nodes: [
        { id: "t", type: "trigger", position: { x: 0, y: 0 }, data: {} },
        { id: "a1", type: "action", position: { x: 0, y: 0 }, data: { action: "add_tag", tag: "quiz-taker" } },
        { id: "a2", type: "action", position: { x: 0, y: 0 }, data: { action: "grant_chapter", courseId: "foundations" } },
        { id: "x", type: "exit", position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [
        { id: "1", source: "t", target: "a1" },
        { id: "2", source: "a1", target: "a2" },
        { id: "3", source: "a2", target: "x" },
      ],
    };
    const plan = planRun(graph, start, facts({ unsubscribed: true, holdUntil: "2026-10-04T06:00:00.000Z" }), NOW);
    expect(plan.actions).toEqual([
      { kind: "act", nodeId: "a1" },
      { kind: "act", nodeId: "a2" },
    ]);
    expect(plan.status).toBe("done");
  });

  it("pauses after an action that a condition follows, so the condition sees what the action did", () => {
    const graph: FlowGraph = {
      nodes: [
        { id: "t", type: "trigger", position: { x: 0, y: 0 }, data: {} },
        { id: "a", type: "action", position: { x: 0, y: 0 }, data: { action: "add_tag", tag: "vip" } },
        { id: "c", type: "condition", position: { x: 0, y: 0 }, data: { check: "has_tag", tag: "vip" } },
        { id: "yes", type: "exit", position: { x: 0, y: 0 }, data: {} },
        { id: "no", type: "exit", position: { x: 0, y: 0 }, data: {} },
      ],
      edges: [
        { id: "1", source: "t", target: "a" },
        { id: "2", source: "a", target: "c" },
        { id: "3", source: "c", target: "yes", sourceHandle: "yes" },
        { id: "4", source: "c", target: "no", sourceHandle: "no" },
      ],
    };
    const plan = planRun(graph, start, facts(), NOW);
    expect(plan).toMatchObject({ status: "active", actions: [{ kind: "act", nodeId: "a" }], state: { nodeId: "c" } });
    // Next tick, with the tag in place, the condition answers yes.
    expect(planRun(graph, plan.state, facts({ condition: (id) => id === "c" }), NOW)).toMatchObject({ status: "done", actions: [] });
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
