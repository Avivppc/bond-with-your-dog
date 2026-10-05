/**
 * Every way a person can enter an email flow, with the settings each one takes. The database side
 * is public.flow_trigger_candidates (same keys and params). Pure: used by the builder and the runner.
 */

export type FlowTrigger =
  | "signed_up"
  | "onboarding_completed"
  | "chapter_purchased"
  | "chapter_started"
  | "chapter_progress"
  | "chapter_completed"
  | "inactive_practice"
  | "inactive_app"
  | "lesson_completed"
  | "feedback_replied"
  | "checkout_abandoned"
  | "purchase_made"
  | "code_expiring"
  | "quiz_lead";

export type TriggerGroup = "Member journey" | "Engagement" | "Sales" | "Leads";

export interface TriggerParamDef {
  key: "courseId" | "percent" | "days" | "hours";
  label: string;
  kind: "chapter" | "number";
  /** Number settings: bounds and starting value. */
  min?: number;
  max?: number;
  defaultValue?: number;
  unit?: string;
}

export interface TriggerParams {
  courseId?: string | null;
  percent?: number;
  days?: number;
  hours?: number;
}

export type OfferKind = "none" | "next_chapter" | "chapter" | "abandoned_offer";
export interface FlowOffer {
  kind: OfferKind;
  courseId?: string | null;
}

export type GoalKind = "none" | "bought_offer" | "any_purchase" | "practiced" | "signed_up";
export interface FlowGoal {
  kind: GoalKind;
}

export interface TriggerDef {
  key: FlowTrigger;
  group: TriggerGroup;
  label: string;
  description: string;
  params: readonly TriggerParamDef[];
  /** "lead": people without an account (quiz); everyone else is a member. */
  audience: "member" | "lead";
  /** Sensible defaults when this trigger is picked. */
  defaults: { offer: FlowOffer; goal: FlowGoal; reentry: "once" | "each_time" };
}

const CHAPTER: TriggerParamDef = { key: "courseId", label: "Chapter", kind: "chapter" };

export const TRIGGERS: readonly TriggerDef[] = [
  {
    key: "signed_up",
    group: "Member journey",
    label: "Signs up",
    description: "Someone creates a Bonded account.",
    params: [],
    audience: "member",
    defaults: { offer: { kind: "none" }, goal: { kind: "any_purchase" }, reentry: "once" },
  },
  {
    key: "onboarding_completed",
    group: "Member journey",
    label: "Finishes onboarding",
    description: "A member completes the welcome questions about their dog.",
    params: [],
    audience: "member",
    defaults: { offer: { kind: "none" }, goal: { kind: "none" }, reentry: "once" },
  },
  {
    key: "chapter_purchased",
    group: "Member journey",
    label: "Gets a chapter",
    description: "A member buys (or is given) a chapter. Good for a welcome series.",
    params: [CHAPTER],
    audience: "member",
    defaults: { offer: { kind: "none" }, goal: { kind: "none" }, reentry: "each_time" },
  },
  {
    key: "chapter_started",
    group: "Member journey",
    label: "Starts a chapter",
    description: "A member opens their first lesson in a chapter.",
    params: [CHAPTER],
    audience: "member",
    defaults: { offer: { kind: "none" }, goal: { kind: "none" }, reentry: "each_time" },
  },
  {
    key: "chapter_progress",
    group: "Member journey",
    label: "Reaches a share of a chapter",
    description: "A member completes a set share of a chapter's lessons.",
    params: [{ key: "percent", label: "Share of lessons done", kind: "number", min: 10, max: 99, defaultValue: 80, unit: "%" }, CHAPTER],
    audience: "member",
    defaults: { offer: { kind: "next_chapter" }, goal: { kind: "bought_offer" }, reentry: "each_time" },
  },
  {
    key: "chapter_completed",
    group: "Member journey",
    label: "Completes a chapter",
    description: "A member finishes every lesson of a chapter.",
    params: [CHAPTER],
    audience: "member",
    defaults: { offer: { kind: "next_chapter" }, goal: { kind: "bought_offer" }, reentry: "each_time" },
  },
  {
    key: "inactive_practice",
    group: "Engagement",
    label: "Stops practicing",
    description: "A member with a chapter hasn't logged practice for a while.",
    params: [{ key: "days", label: "Days without practice", kind: "number", min: 2, max: 90, defaultValue: 7, unit: "days" }],
    audience: "member",
    defaults: { offer: { kind: "none" }, goal: { kind: "practiced" }, reentry: "each_time" },
  },
  {
    key: "inactive_app",
    group: "Engagement",
    label: "Stops visiting",
    description: "A member hasn't signed in to the app for a while.",
    params: [{ key: "days", label: "Days away", kind: "number", min: 3, max: 180, defaultValue: 14, unit: "days" }],
    audience: "member",
    defaults: { offer: { kind: "none" }, goal: { kind: "none" }, reentry: "each_time" },
  },
  {
    key: "lesson_completed",
    group: "Engagement",
    label: "Completes a lesson",
    description: "A member marks a lesson complete (each lesson counts once).",
    params: [CHAPTER],
    audience: "member",
    defaults: { offer: { kind: "none" }, goal: { kind: "none" }, reentry: "each_time" },
  },
  {
    key: "feedback_replied",
    group: "Engagement",
    label: "Gets feedback from Roni",
    description: "Roni replies to a member's video.",
    params: [],
    audience: "member",
    defaults: { offer: { kind: "none" }, goal: { kind: "none" }, reentry: "each_time" },
  },
  {
    key: "checkout_abandoned",
    group: "Sales",
    label: "Abandons checkout",
    description: "A member starts paying for something and doesn't finish.",
    params: [{ key: "hours", label: "Wait before it counts", kind: "number", min: 1, max: 72, defaultValue: 2, unit: "hours" }],
    audience: "member",
    defaults: { offer: { kind: "abandoned_offer" }, goal: { kind: "bought_offer" }, reentry: "each_time" },
  },
  {
    key: "purchase_made",
    group: "Sales",
    label: "Makes a purchase",
    description: "A member's payment goes through.",
    params: [],
    audience: "member",
    defaults: { offer: { kind: "none" }, goal: { kind: "none" }, reentry: "each_time" },
  },
  {
    key: "code_expiring",
    group: "Sales",
    label: "Discount code is about to expire",
    description: "A member's unused personal code ends soon.",
    params: [{ key: "days", label: "Days before it ends", kind: "number", min: 1, max: 14, defaultValue: 2, unit: "days" }],
    audience: "member",
    defaults: { offer: { kind: "next_chapter" }, goal: { kind: "bought_offer" }, reentry: "each_time" },
  },
  {
    key: "quiz_lead",
    group: "Leads",
    label: "Takes the quiz",
    description: "Someone fills in the website quiz and hasn't created an account yet.",
    params: [],
    audience: "lead",
    defaults: { offer: { kind: "none" }, goal: { kind: "signed_up" }, reentry: "once" },
  },
];

export const TRIGGER_GROUPS: readonly TriggerGroup[] = ["Member journey", "Engagement", "Sales", "Leads"];

export function triggerDef(key: FlowTrigger): TriggerDef {
  return TRIGGERS.find((t) => t.key === key) ?? TRIGGERS[0];
}

export function isTrigger(value: string): value is FlowTrigger {
  return TRIGGERS.some((t) => t.key === value);
}

/** The trigger's settings with defaults filled and numbers kept in range. */
export function normalizeParams(key: FlowTrigger, params: TriggerParams): TriggerParams {
  const out: TriggerParams = {};
  for (const p of triggerDef(key).params) {
    if (p.kind === "chapter") {
      out.courseId = params.courseId || null;
      continue;
    }
    const raw = Number(params[p.key as "percent" | "days" | "hours"]);
    const value = Number.isFinite(raw) ? Math.round(raw) : (p.defaultValue ?? 0);
    out[p.key as "percent" | "days" | "hours"] = Math.min(p.max ?? value, Math.max(p.min ?? value, value));
  }
  return out;
}

/** "Reaches 80% of Bonded: Foundations", "Stops practicing for 7 days" — the trigger card's summary. */
export function describeTrigger(key: FlowTrigger, params: TriggerParams, chapterTitle?: string): string {
  const p = normalizeParams(key, params);
  const chapter = chapterTitle ?? "any chapter";
  switch (key) {
    case "chapter_progress":
      return `Reaches ${p.percent}% of ${chapter}`;
    case "chapter_completed":
      return `Completes ${chapter}`;
    case "chapter_purchased":
      return `Gets ${chapter}`;
    case "chapter_started":
      return `Starts ${chapter}`;
    case "lesson_completed":
      return `Completes a lesson in ${chapter}`;
    case "inactive_practice":
      return `No practice for ${p.days} days`;
    case "inactive_app":
      return `Away from the app for ${p.days} days`;
    case "checkout_abandoned":
      return `Checkout not finished after ${p.hours} hours`;
    case "code_expiring":
      return `Code ends in ${p.days} days`;
    default:
      return triggerDef(key).label;
  }
}

export const OFFER_LABEL: Record<OfferKind, string> = {
  none: "Nothing to sell",
  next_chapter: "The next chapter",
  chapter: "A specific chapter",
  abandoned_offer: "What they left in checkout",
};

export const GOAL_LABEL: Record<GoalKind, string> = {
  none: "Never (they finish the flow)",
  bought_offer: "They buy what the flow offers",
  any_purchase: "They buy anything",
  practiced: "They log a practice session",
  signed_up: "They create an account",
};
