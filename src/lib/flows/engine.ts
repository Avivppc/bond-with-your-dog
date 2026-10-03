import { findNode, nextNodeId, waitMs, type Branch, type FlowGraph } from "./graph";

/**
 * Moves one member through a flow, Klaviyo-style: from where they are, follow the graph until they
 * must wait, finish or leave. Emails along the way come back as "send" actions for the caller to
 * deliver. Pure: the caller supplies the facts (bought? unsubscribed? opened?) and the clock.
 */

export type RunStatus = "active" | "waiting" | "done" | "exited";

export interface RunState {
  nodeId: string;
  /** Set while the member sits in a wait step. */
  waitUntil: string | null;
  /** The last email node this member reached, for "opened / clicked" conditions. */
  lastEmailNodeId: string | null;
}

export interface RunFacts {
  /** They bought the chapter the flow sells: they leave the flow. */
  purchased: boolean;
  /** They unsubscribed: emails are skipped, the flow still runs (and stops at the end). */
  unsubscribed: boolean;
  opened(emailNodeId: string): boolean;
  clicked(emailNodeId: string): boolean;
  /** A stable number in [0, 1) for this member, for A/B splits. */
  bucket: number;
}

export type RunAction = { kind: "send"; nodeId: string; variant: string | null } | { kind: "skip"; nodeId: string; reason: "unsubscribed" };

export interface RunPlan {
  actions: RunAction[];
  status: RunStatus;
  state: RunState;
  exitReason: string | null;
}

/** Guard against a malformed graph spinning forever. */
const MAX_STEPS = 100;

export function planRun(graph: FlowGraph, start: RunState, facts: RunFacts, now: Date): RunPlan {
  const actions: RunAction[] = [];
  let state = { ...start };
  let variant: string | null = null;
  const finish = (status: RunStatus, exitReason: string | null = null): RunPlan => ({ actions, status, state, exitReason });

  for (let step = 0; step < MAX_STEPS; step++) {
    if (facts.purchased) return finish("exited", "purchased");
    const node = findNode(graph, state.nodeId);
    if (!node) return finish("exited", "step_removed");

    let branch: Branch | null = null;
    switch (node.type) {
      case "exit":
        return finish("done");
      case "wait": {
        if (state.waitUntil === null) {
          state = { ...state, waitUntil: new Date(now.getTime() + waitMs(node)).toISOString() };
          return finish("waiting");
        }
        if (new Date(state.waitUntil) > now) return finish("waiting");
        state = { ...state, waitUntil: null };
        break;
      }
      case "email":
        actions.push(facts.unsubscribed ? { kind: "skip", nodeId: node.id, reason: "unsubscribed" } : { kind: "send", nodeId: node.id, variant });
        state = { ...state, lastEmailNodeId: node.id };
        break;
      case "condition": {
        const last = state.lastEmailNodeId;
        const yes = last !== null && (node.data.check === "opened" ? facts.opened(last) || facts.clicked(last) : facts.clicked(last));
        branch = yes ? "yes" : "no";
        break;
      }
      case "split":
        branch = facts.bucket * 100 < node.data.percentA ? "a" : "b";
        variant = branch.toUpperCase();
        break;
      case "trigger":
        break;
    }

    const next = nextNodeId(graph, node.id, branch);
    if (!next) return finish("done");
    state = { ...state, nodeId: next };
  }
  return finish("exited", "too_many_steps");
}

/** A stable bucket in [0, 1) from a run id, so a member stays on the same A/B side on every tick. */
export function bucketFor(runId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < runId.length; i++) {
    hash ^= runId.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}
