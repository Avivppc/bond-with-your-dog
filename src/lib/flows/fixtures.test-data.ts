import type { FlowGraph } from "./graph";

/** Trigger → email → wait 2 days → opened? yes: exit · no: reminder email → exit. Shared by the flow tests. */
const at = { x: 0, y: 0 };
export const SAMPLE: FlowGraph = {
  nodes: [
    { id: "t", type: "trigger", position: at, data: {} },
    { id: "e1", type: "email", position: at, data: { subject: "Ready for Moves?", preheader: "", body: "Hi {{first_name}}", ctaLabel: "Get Moves" } },
    { id: "w", type: "wait", position: at, data: { days: 2, hours: 0 } },
    { id: "c", type: "condition", position: at, data: { check: "opened" } },
    { id: "e2", type: "email", position: at, data: { subject: "Last chance", preheader: "", body: "Code ends soon", ctaLabel: "" } },
    { id: "x", type: "exit", position: at, data: {} },
  ],
  edges: [
    { id: "1", source: "t", target: "e1" },
    { id: "2", source: "e1", target: "w" },
    { id: "3", source: "w", target: "c" },
    { id: "4", source: "c", target: "e2", sourceHandle: "no" },
    { id: "5", source: "c", target: "x", sourceHandle: "yes" },
    { id: "6", source: "e2", target: "x" },
  ],
};
