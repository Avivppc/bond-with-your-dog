import { findNode, nextNodeId, waitMs, type Branch, type FlowGraph, type WaitNode } from "./graph";
import { nextLocalTime } from "./local-time";

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
  /** One of the flow's exit conditions is true (bought, practiced, got a tag…): they leave the flow. */
  goalReached: boolean;
  /** Which exit took them out, e.g. "exit:practiced" (stored on the run). */
  exitReason?: string;
  /** Their time zone, for "wait until 10:00 their time". */
  timezone?: string | null;
  /** They unsubscribed: emails are skipped, the flow still runs (and stops at the end). */
  unsubscribed: boolean;
  /** Smart sending: they got a marketing email very recently, so this one is skipped. */
  recentlyEmailed: boolean;
  /** Quiet hours: it's night where they are; emails wait until this moment (null = send now). */
  holdUntil: string | null;
  opened(emailNodeId: string): boolean;
  clicked(emailNodeId: string): boolean;
  /** Answers for conditions about member data (owns a chapter, practiced…), by condition node id. */
  condition(conditionNodeId: string): boolean;
  /** A stable number in [0, 1) for this person, for A/B splits. */
  bucket: number;
}

export type SkipReason = "unsubscribed" | "smart_sending";
export type RunAction =
  | { kind: "send"; nodeId: string; variant: string | null }
  | { kind: "skip"; nodeId: string; reason: SkipReason }
  /** An action step (tag, chapter, notification, webhook): not email, so consent and quiet hours don't apply. */
  | { kind: "act"; nodeId: string };

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
    if (facts.goalReached) return finish("exited", facts.exitReason ?? "goal");
    const node = findNode(graph, state.nodeId);
    if (!node) return finish("exited", "step_removed");

    let branch: Branch | null = null;
    switch (node.type) {
      case "exit":
        return finish("done");
      case "wait": {
        if (state.waitUntil === null) {
          state = { ...state, waitUntil: waitEnd(node, now, facts.timezone ?? null).toISOString() };
          return finish("waiting");
        }
        if (new Date(state.waitUntil) > now) return finish("waiting");
        state = { ...state, waitUntil: null };
        break;
      }
      case "email": {
        if (facts.unsubscribed) actions.push({ kind: "skip", nodeId: node.id, reason: "unsubscribed" });
        else if (facts.recentlyEmailed) actions.push({ kind: "skip", nodeId: node.id, reason: "smart_sending" });
        else if (facts.holdUntil && actions.length === 0) {
          // Quiet hours: stay on this email until morning where they are.
          state = { ...state, waitUntil: facts.holdUntil };
          return finish("waiting");
        } else actions.push({ kind: "send", nodeId: node.id, variant });
        state = { ...state, lastEmailNodeId: node.id, waitUntil: null };
        break;
      }
      case "action": {
        actions.push({ kind: "act", nodeId: node.id });
        // The facts were read before this action ran: let a following condition ask again next run.
        const following = nextNodeId(graph, node.id);
        if (following && findNode(graph, following)?.type === "condition") {
          state = { ...state, nodeId: following };
          return finish("active");
        }
        break;
      }
      case "condition": {
        const last = state.lastEmailNodeId;
        const yes =
          node.data.check === "opened"
            ? last !== null && (facts.opened(last) || facts.clicked(last))
            : node.data.check === "clicked"
              ? last !== null && facts.clicked(last)
              : facts.condition(node.id);
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

/** When a wait step lets the person go: after its duration, or at the next local time it names. */
function waitEnd(node: WaitNode, now: Date, timezone: string | null): Date {
  if (node.data.mode === "until") return nextLocalTime(now, timezone, node.data.atHour ?? 10, node.data.weekday ?? null);
  return new Date(now.getTime() + waitMs(node));
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
