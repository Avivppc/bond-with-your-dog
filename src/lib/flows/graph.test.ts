import { describe, expect, it } from "vitest";
import { nextNodeId, validateGraph, waitMs } from "./graph";
import { SAMPLE } from "./fixtures.test-data";

const at = { x: 0, y: 0 };

describe("validateGraph", () => {
  it("accepts a complete flow", () => {
    expect(validateGraph(SAMPLE)).toEqual([]);
  });

  it("needs exactly one trigger", () => {
    expect(validateGraph({ nodes: [], edges: [] })).toEqual(["A flow needs exactly one trigger."]);
  });

  it("flags a condition with an unconnected path", () => {
    const graph = { ...SAMPLE, edges: SAMPLE.edges.filter((e) => e.id !== "5") };
    expect(validateGraph(graph)).toContain("A condition step (YES path) isn't connected to a next step.");
  });

  it("flags an email without a subject", () => {
    const nodes = SAMPLE.nodes.map((n) => (n.id === "e1" && n.type === "email" ? { ...n, data: { ...n.data, subject: " " } } : n));
    expect(validateGraph({ ...SAMPLE, nodes })).toContain("An email is missing its subject.");
  });

  it("flags loops and orphan steps", () => {
    const loop = { ...SAMPLE, edges: [...SAMPLE.edges.filter((e) => e.id !== "6"), { id: "7", source: "e2", target: "e1" }] };
    expect(validateGraph(loop)).toContain("The flow loops back on itself; connect steps forward only.");
    const orphan = { ...SAMPLE, nodes: [...SAMPLE.nodes, { id: "lost", type: "exit" as const, position: at, data: {} }] };
    expect(validateGraph(orphan)).toContain("Some steps aren't connected to the trigger.");
  });

  it("rejects a zero-length wait", () => {
    const nodes = SAMPLE.nodes.map((n) => (n.type === "wait" ? { ...n, data: { days: 0, hours: 0 } } : n));
    expect(validateGraph({ ...SAMPLE, nodes })).toContain("A wait step needs 1 hour to 60 days.");
  });
});

describe("graph helpers", () => {
  it("follows branches", () => {
    expect(nextNodeId(SAMPLE, "c", "yes")).toBe("x");
    expect(nextNodeId(SAMPLE, "c", "no")).toBe("e2");
    expect(nextNodeId(SAMPLE, "t")).toBe("e1");
  });

  it("measures waits", () => {
    expect(waitMs({ id: "w", type: "wait", position: at, data: { days: 1, hours: 2 } })).toBe(26 * 3600 * 1000);
  });
});
