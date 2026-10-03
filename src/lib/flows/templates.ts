import type { FlowGraph, FlowNode, FlowNodeType, FlowTrigger } from "./graph";

/**
 * Starting points for new flows (so Roni edits words, not wiring) and fresh steps for the builder's
 * "Add step" menu. Pure.
 */

export interface FlowTemplate {
  key: string;
  name: string;
  description: string;
  trigger: FlowTrigger;
  discountPercent: number | null;
  discountValidDays: number | null;
  graph: FlowGraph;
}

const COL = 260;
const ROW = 150;
const pos = (row: number, col = 0) => ({ x: col * COL, y: row * ROW });

const nextChapterAt80: FlowGraph = {
  nodes: [
    { id: "trigger", type: "trigger", position: pos(0), data: {} },
    {
      id: "email-1",
      type: "email",
      position: pos(1),
      data: {
        subject: "{{dog_name}} is almost through {{chapter}}",
        preheader: "Your next chapter, with {{discount_percent}} off for you",
        body: "Hi {{first_name}},\n\nYou and {{dog_name}} are nearly at the end of {{chapter}}. The work you've put in is exactly what {{next_chapter}} builds on.\n\nAs a member, you get {{discount_percent}} off {{next_chapter}}: {{discounted_price}} instead of {{price}}. Your personal code {{discount_code}} is good until {{discount_expires}}.",
        ctaLabel: "Continue to {{next_chapter}}",
      },
    },
    { id: "wait-1", type: "wait", position: pos(2), data: { days: 3, hours: 0 } },
    { id: "check-1", type: "condition", position: pos(3), data: { check: "clicked" } },
    { id: "exit-yes", type: "exit", position: pos(4, -1), data: {} },
    {
      id: "email-2",
      type: "email",
      position: pos(4, 1),
      data: {
        subject: "Your {{discount_percent}} code ends {{discount_expires}}",
        preheader: "{{next_chapter}} is waiting for you and {{dog_name}}",
        body: "Hi {{first_name}},\n\nA quick reminder: your code {{discount_code}} for {{next_chapter}} is valid until {{discount_expires}}.\n\nWhen you finish {{chapter}}, {{next_chapter}} opens right away.",
        ctaLabel: "Get {{next_chapter}}",
      },
    },
    { id: "exit-no", type: "exit", position: pos(5, 1), data: {} },
  ],
  edges: [
    { id: "e1", source: "trigger", target: "email-1" },
    { id: "e2", source: "email-1", target: "wait-1" },
    { id: "e3", source: "wait-1", target: "check-1" },
    { id: "e4", source: "check-1", target: "exit-yes", sourceHandle: "yes" },
    { id: "e5", source: "check-1", target: "email-2", sourceHandle: "no" },
    { id: "e6", source: "email-2", target: "exit-no" },
  ],
};

const chapterComplete: FlowGraph = {
  nodes: [
    { id: "trigger", type: "trigger", position: pos(0), data: {} },
    {
      id: "email-1",
      type: "email",
      position: pos(1),
      data: {
        subject: "You finished {{chapter}}! What's next for {{dog_name}}",
        preheader: "A thank-you from Roni, and {{discount_percent}} off {{next_chapter}}",
        body: "Hi {{first_name}},\n\nYou and {{dog_name}} finished {{chapter}}. That's a real milestone, and your certificate is waiting in the app.\n\nReady for {{next_chapter}}? As a thank-you, here's {{discount_percent}} off: {{discounted_price}} instead of {{price}} with your code {{discount_code}}, until {{discount_expires}}.",
        ctaLabel: "Start {{next_chapter}}",
      },
    },
    { id: "wait-1", type: "wait", position: pos(2), data: { days: 4, hours: 0 } },
    { id: "check-1", type: "condition", position: pos(3), data: { check: "opened" } },
    {
      id: "email-2",
      type: "email",
      position: pos(4, -1),
      data: {
        subject: "Still thinking about {{next_chapter}}?",
        preheader: "Your code ends {{discount_expires}}",
        body: "Hi {{first_name}},\n\nJust a nudge: your {{discount_percent}} code {{discount_code}} for {{next_chapter}} ends on {{discount_expires}}.",
        ctaLabel: "Get {{next_chapter}}",
      },
    },
    {
      id: "email-3",
      type: "email",
      position: pos(4, 1),
      data: {
        subject: "Did you miss this, {{first_name}}?",
        preheader: "{{discount_percent}} off {{next_chapter}} for you and {{dog_name}}",
        body: "Hi {{first_name}},\n\nWe sent you a thank-you for finishing {{chapter}}, with {{discount_percent}} off {{next_chapter}}. Your code {{discount_code}} is still good until {{discount_expires}}.",
        ctaLabel: "See {{next_chapter}}",
      },
    },
    { id: "exit-1", type: "exit", position: pos(5, -1), data: {} },
    { id: "exit-2", type: "exit", position: pos(5, 1), data: {} },
  ],
  edges: [
    { id: "e1", source: "trigger", target: "email-1" },
    { id: "e2", source: "email-1", target: "wait-1" },
    { id: "e3", source: "wait-1", target: "check-1" },
    { id: "e4", source: "check-1", target: "email-2", sourceHandle: "yes" },
    { id: "e5", source: "check-1", target: "email-3", sourceHandle: "no" },
    { id: "e6", source: "email-2", target: "exit-1" },
    { id: "e7", source: "email-3", target: "exit-2" },
  ],
};

export const FLOW_TEMPLATES: readonly FlowTemplate[] = [
  {
    key: "next-chapter-80",
    name: "Next chapter at 80%",
    description: "When a member is 80% through a chapter: an offer for the next one, and a reminder if they didn't click.",
    trigger: "chapter_80",
    discountPercent: 20,
    discountValidDays: 7,
    graph: nextChapterAt80,
  },
  {
    key: "chapter-complete",
    name: "Chapter completed",
    description: "When a member finishes a chapter: congratulations with an offer, then a follow-up based on whether they opened it.",
    trigger: "chapter_completed",
    discountPercent: 20,
    discountValidDays: 7,
    graph: chapterComplete,
  },
];

export const TRIGGER_LABEL: Record<FlowTrigger, string> = {
  chapter_80: "Reaches 80% of a chapter",
  chapter_completed: "Completes a chapter",
};

/** A fresh step for the builder, placed at `position`. */
export function newNode(type: Exclude<FlowNodeType, "trigger">, id: string, position: { x: number; y: number }): FlowNode {
  switch (type) {
    case "wait":
      return { id, type, position, data: { days: 2, hours: 0 } };
    case "email":
      return { id, type, position, data: { subject: "", preheader: "", body: "Hi {{first_name}},\n\n", ctaLabel: "Get {{next_chapter}}" } };
    case "condition":
      return { id, type, position, data: { check: "opened" } };
    case "split":
      return { id, type, position, data: { percentA: 50 } };
    case "exit":
      return { id, type, position, data: {} };
  }
}
