import { describe, expect, it } from "vitest";
import { validateGraph } from "./graph";
import { insertOnEdge, tidyLayout, COL_WIDTH, ROW_HEIGHT } from "./layout";
import { SAMPLE } from "./fixtures.test-data";
import { newNode } from "./templates";

const ids = (n: number) => `new-${n}`;

describe("insertOnEdge", () => {
  it("puts a step in the middle of a connection and keeps the flow valid", () => {
    const graph = insertOnEdge(SAMPLE, "2", newNode("wait", "w2", { x: 0, y: 0 }), ids);
    expect(graph.edges.find((e) => e.source === "e1")?.target).toBe("w2");
    expect(graph.edges.find((e) => e.source === "w2")?.target).toBe("w");
    expect(validateGraph(graph)).toEqual([]);
  });

  it("keeps the branch of the connection it splits, and continues through YES for a condition", () => {
    const graph = insertOnEdge(SAMPLE, "4", newNode("condition", "c2", { x: 0, y: 0 }), ids);
    expect(graph.edges.find((e) => e.target === "c2")).toMatchObject({ source: "c", sourceHandle: "no" });
    expect(graph.edges.find((e) => e.source === "c2")).toMatchObject({ target: "e2", sourceHandle: "yes" });
  });

  it("refuses an exit in the middle of a flow", () => {
    expect(insertOnEdge(SAMPLE, "2", newNode("exit", "x2", { x: 0, y: 0 }), ids)).toBe(SAMPLE);
  });
});

describe("tidyLayout", () => {
  it("lays steps out top to bottom with branches side by side", () => {
    const tidy = tidyLayout(SAMPLE);
    const at = (id: string) => tidy.nodes.find((n) => n.id === id)?.position;
    expect(at("t")?.y).toBe(0);
    expect(at("e1")?.y).toBe(ROW_HEIGHT);
    expect(at("c")?.y).toBe(3 * ROW_HEIGHT);
    // YES (exit) on the left, NO (reminder) on the right, a column apart.
    expect((at("e2")?.x ?? 0) - (at("x")?.x ?? 0)).toBe(COL_WIDTH);
  });
});
