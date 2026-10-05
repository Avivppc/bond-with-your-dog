import { BRANCHES, triggerNode, type FlowGraph, type FlowNode } from "./graph";

/** Canvas helpers for the flow builder: insert a step on a connection, tidy the layout. Pure. */

export const COL_WIDTH = 260;
export const ROW_HEIGHT = 150;

/**
 * Puts `node` on the connection `edgeId` (source → node → target). The step continues to the old
 * target through its first exit (YES for a condition, A for a split). An exit step can't sit in the
 * middle of a connection.
 */
export function insertOnEdge(graph: FlowGraph, edgeId: string, node: FlowNode, newEdgeId: (n: number) => string): FlowGraph {
  const edge = graph.edges.find((e) => e.id === edgeId);
  if (!edge || node.type === "exit" || node.type === "trigger") return graph;
  const firstExit = BRANCHES[node.type][0] ?? null;
  return {
    nodes: [...graph.nodes, node],
    edges: [
      ...graph.edges.filter((e) => e.id !== edgeId),
      { id: newEdgeId(0), source: edge.source, target: node.id, sourceHandle: edge.sourceHandle ?? null },
      { id: newEdgeId(1), source: node.id, target: edge.target, sourceHandle: firstExit },
    ],
  };
}

/**
 * Top-to-bottom tree layout from the trigger: each step one row below its parent, branches side by
 * side (YES/A left, NO/B right), subtrees never overlapping. Steps not reachable from the trigger
 * keep their position.
 */
export function tidyLayout(graph: FlowGraph): FlowGraph {
  const start = triggerNode(graph);
  if (!start) return graph;
  const children = (id: string): string[] => {
    const node = graph.nodes.find((n) => n.id === id);
    if (!node) return [];
    return BRANCHES[node.type].map((h) => graph.edges.find((e) => e.source === id && (e.sourceHandle ?? null) === h)?.target).filter((t): t is string => Boolean(t));
  };

  // Width of each subtree in columns (a node reached twice is laid out where it's first met).
  const seen = new Set<string>();
  const width = new Map<string, number>();
  const measure = (id: string): number => {
    if (seen.has(id)) return 0;
    seen.add(id);
    const kids = children(id).filter((k) => !seen.has(k));
    const total = kids.reduce((sum, k) => sum + Math.max(measure(k), 1), 0);
    const w = Math.max(total, 1);
    width.set(id, w);
    return w;
  };
  measure(start.id);

  const positions = new Map<string, { x: number; y: number }>();
  const place = (id: string, row: number, left: number) => {
    if (positions.has(id) || !width.has(id)) return;
    const w = width.get(id) ?? 1;
    positions.set(id, { x: Math.round((left + (w - 1) / 2) * COL_WIDTH), y: row * ROW_HEIGHT });
    let cursor = left;
    for (const kid of children(id)) {
      if (positions.has(kid) || !width.has(kid)) continue;
      place(kid, row + 1, cursor);
      cursor += width.get(kid) ?? 1;
    }
  };
  place(start.id, 0, 0);
  return { ...graph, nodes: graph.nodes.map((n) => ({ ...n, position: positions.get(n.id) ?? n.position }) as FlowNode) };
}
