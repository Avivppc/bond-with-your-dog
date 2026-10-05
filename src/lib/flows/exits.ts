import { normalizeTag } from "./actions";
import type { FlowGoal } from "./triggers";

/**
 * Exit conditions: the person leaves the flow as soon as any one of them is true (checked before
 * every step). They replace the single "goal" older flows had. Pure.
 */

export type ExitKind = "bought_offer" | "any_purchase" | "practiced" | "signed_up" | "has_tag" | "completed_chapter" | "owns_chapter" | "unsubscribed";

export interface ExitCondition {
  kind: ExitKind;
  /** completed_chapter / owns_chapter */
  courseId?: string | null;
  /** has_tag */
  tag?: string;
}

export const EXIT_KINDS: readonly ExitKind[] = ["bought_offer", "any_purchase", "practiced", "signed_up", "has_tag", "completed_chapter", "owns_chapter", "unsubscribed"];

export const EXIT_LABEL: Record<ExitKind, string> = {
  bought_offer: "Bought what the flow offers",
  any_purchase: "Bought anything",
  practiced: "Logged a practice session",
  signed_up: "Created an account (quiz leads)",
  has_tag: "Got a tag",
  completed_chapter: "Finished a chapter",
  owns_chapter: "Has a chapter",
  unsubscribed: "Unsubscribed from emails",
};

export const MAX_EXITS = 6;

/** What keeps the exit list from being saved, in plain words. */
export function exitProblems(exits: readonly ExitCondition[]): string[] {
  const problems = exits.flatMap((e) => {
    if ((e.kind === "completed_chapter" || e.kind === "owns_chapter") && !e.courseId) return ["An exit about a chapter needs the chapter picked."];
    if (e.kind === "has_tag" && !normalizeTag(e.tag ?? "")) return ["An exit about a tag needs the tag."];
    return [];
  });
  if (exits.length > MAX_EXITS) problems.push(`Up to ${MAX_EXITS} exit conditions.`);
  return problems;
}

/** Keeps only what each kind uses, so stale fields don't linger after a change of kind. */
export function cleanExit(e: ExitCondition): ExitCondition {
  if (e.kind === "completed_chapter" || e.kind === "owns_chapter") return { kind: e.kind, courseId: e.courseId ?? null };
  if (e.kind === "has_tag") return { kind: e.kind, tag: normalizeTag(e.tag ?? "") };
  return { kind: e.kind };
}

/** A flow's exits: its saved list, or (older flows) its single goal. */
export function exitsOf(saved: unknown, legacyGoal: FlowGoal | null | undefined): ExitCondition[] {
  if (Array.isArray(saved)) return saved.filter((e): e is ExitCondition => Boolean(e) && EXIT_KINDS.includes((e as ExitCondition).kind));
  return legacyGoal && legacyGoal.kind !== "none" ? [{ kind: legacyGoal.kind }] : [];
}

/** "Exited: bought", for the people list. */
export function exitReasonLabel(reason: string | null): string {
  if (!reason) return "";
  const kind = reason.startsWith("exit:") ? (reason.slice(5) as ExitKind) : null;
  if (kind && kind in EXIT_LABEL) return EXIT_LABEL[kind].toLowerCase();
  const OTHER: Record<string, string> = { goal: "reached the goal", removed: "removed by the team", step_removed: "step removed", too_many_steps: "error" };
  return OTHER[reason] ?? reason;
}
