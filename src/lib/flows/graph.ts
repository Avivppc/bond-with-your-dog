/**
 * An email flow is a graph, stored in React Flow's shape (nodes + edges) so the admin canvas can
 * load and save it as-is. One trigger node starts it; wait / email / condition / split / exit nodes
 * follow. Edges carry the branch in `sourceHandle` ("yes"/"no" for a condition, "a"/"b" for a split).
 * Pure: shared by the builder, the validator and the engine.
 */

import type { EmailDoc } from "@/lib/email-blocks/types";

export type { FlowTrigger } from "./triggers";

/** What a condition step asks. opened/clicked are about the last email this person got in the flow. */
export type ConditionCheck = "opened" | "clicked" | "owns_chapter" | "completed_chapter" | "practiced_recently" | "has_purchased" | "is_member";
export type Branch = "yes" | "no" | "a" | "b";

/** The email an email step sends. Older flows stored plain text (subject/body/button). */
export interface LegacyEmailData {
  subject: string;
  preheader: string;
  body: string;
  ctaLabel: string;
}
export type EmailStepData = EmailDoc | LegacyEmailData;

interface Base {
  id: string;
  position: { x: number; y: number };
}

export interface TriggerNode extends Base {
  type: "trigger";
  data: Record<string, never>;
}
export interface WaitNode extends Base {
  type: "wait";
  data: { days: number; hours: number };
}
export interface EmailNode extends Base {
  type: "email";
  data: EmailStepData;
}
export interface ConditionNode extends Base {
  type: "condition";
  /** courseId for the chapter checks, days for "practiced recently". */
  data: { check: ConditionCheck; courseId?: string | null; days?: number };
}
export interface SplitNode extends Base {
  type: "split";
  /** Share of members that take branch A (the rest take B). */
  data: { percentA: number };
}
export interface ExitNode extends Base {
  type: "exit";
  data: Record<string, never>;
}

export type FlowNode = TriggerNode | WaitNode | EmailNode | ConditionNode | SplitNode | ExitNode;
export type FlowNodeType = FlowNode["type"];

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: Branch | null;
}

export interface FlowGraph {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/** The outgoing branches each node type needs; [null] = one plain exit. */
export const BRANCHES: Record<FlowNodeType, readonly (Branch | null)[]> = {
  trigger: [null],
  wait: [null],
  email: [null],
  condition: ["yes", "no"],
  split: ["a", "b"],
  exit: [],
};

export const MAX_WAIT_DAYS = 60;

/** The node an edge out of `nodeId` (on `branch`) leads to, or null. */
export function nextNodeId(graph: FlowGraph, nodeId: string, branch: Branch | null = null): string | null {
  const edge = graph.edges.find((e) => e.source === nodeId && (e.sourceHandle ?? null) === branch);
  return edge?.target ?? null;
}

export function findNode(graph: FlowGraph, nodeId: string): FlowNode | undefined {
  return graph.nodes.find((n) => n.id === nodeId);
}

export function triggerNode(graph: FlowGraph): TriggerNode | undefined {
  return graph.nodes.find((n): n is TriggerNode => n.type === "trigger");
}

export function isLegacyEmail(data: EmailStepData): data is LegacyEmailData {
  return !("blocks" in data);
}

/** Whether an email step has something to say (text, a heading, an image or a button). */
export function emailHasContent(data: EmailStepData): boolean {
  if (isLegacyEmail(data)) return data.body.trim().length > 0;
  return data.blocks.some((b) => (b.type === "text" || b.type === "heading" ? b.text.trim() : b.type === "image" ? b.src : b.type === "button" ? b.label.trim() : false));
}

/** Milliseconds a wait node holds a member. */
export function waitMs(node: WaitNode): number {
  return (node.data.days * 24 + node.data.hours) * 60 * 60 * 1000;
}

function nodeProblems(node: FlowNode): string[] {
  switch (node.type) {
    case "wait": {
      const { days, hours } = node.data;
      const ok = Number.isInteger(days) && Number.isInteger(hours) && days >= 0 && days <= MAX_WAIT_DAYS && hours >= 0 && hours <= 23 && days + hours > 0;
      return ok ? [] : [`A wait step needs 1 hour to ${MAX_WAIT_DAYS} days.`];
    }
    case "email": {
      const problems: string[] = [];
      if (!node.data.subject.trim()) problems.push("An email is missing its subject.");
      if (!emailHasContent(node.data)) problems.push("An email is missing its text.");
      return problems;
    }
    case "condition":
      if ((node.data.check === "owns_chapter" || node.data.check === "completed_chapter") && !node.data.courseId) return ["A condition about a chapter needs the chapter picked."];
      return [];
    case "split":
      return node.data.percentA >= 1 && node.data.percentA <= 99 ? [] : ["An A/B split needs a share between 1% and 99%."];
    default:
      return [];
  }
}

/** Everything that keeps a flow from going live, in plain words; [] when it's ready. */
export function validateGraph(graph: FlowGraph): string[] {
  const problems: string[] = [];
  const triggers = graph.nodes.filter((n) => n.type === "trigger");
  if (triggers.length !== 1) return ["A flow needs exactly one trigger."];
  const ids = new Set(graph.nodes.map((n) => n.id));

  for (const edge of graph.edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) problems.push("A connection points at a step that no longer exists.");
  }
  for (const node of graph.nodes) {
    problems.push(...nodeProblems(node));
    for (const branch of BRANCHES[node.type]) {
      if (!nextNodeId(graph, node.id, branch)) {
        const label = branch ? ` (${branch.toUpperCase()} path)` : "";
        problems.push(`A ${node.type} step${label} isn't connected to a next step.`);
      }
    }
  }

  // Every step must be reachable from the trigger, and the flow can't loop back on itself.
  const reached = new Set<string>();
  const onPath = new Set<string>();
  let loops = false;
  const visit = (id: string) => {
    if (onPath.has(id)) {
      loops = true;
      return;
    }
    if (reached.has(id)) return;
    reached.add(id);
    onPath.add(id);
    for (const e of graph.edges.filter((e) => e.source === id)) visit(e.target);
    onPath.delete(id);
  };
  visit(triggers[0].id);
  if (loops) problems.push("The flow loops back on itself; connect steps forward only.");
  if (graph.nodes.some((n) => !reached.has(n.id))) problems.push("Some steps aren't connected to the trigger.");
  if (!graph.nodes.some((n) => n.type === "email")) problems.push("Add at least one email.");

  return [...new Set(problems)];
}
