import type { EmailBlock, EmailDoc } from "@/lib/email-blocks/types";
import type { FlowGraph, FlowNode, FlowNodeType } from "./graph";
import { triggerDef, type FlowGoal, type FlowOffer, type FlowTrigger, type TriggerParams } from "./triggers";

/**
 * Starting points for new flows (so Roni edits words, not wiring) and fresh steps for the builder.
 * Emails are block documents in the Bonded look. Pure.
 */

export interface FlowTemplate {
  key: string;
  name: string;
  description: string;
  trigger: FlowTrigger;
  triggerParams: TriggerParams;
  offer: FlowOffer;
  goal: FlowGoal;
  reentry: "once" | "each_time";
  discountPercent: number | null;
  discountValidDays: number | null;
  graph: FlowGraph;
}

// ── tiny block builders ──
let seq = 0;
const bid = (p: string) => `${p}-${(seq++).toString(36)}`;
const h = (text: string): EmailBlock => ({ id: bid("h"), type: "heading", text, level: 1, align: "left" });
const p = (text: string): EmailBlock => ({ id: bid("t"), type: "text", text, align: "left" });
const btn = (label: string, url = "{{offer_url}}"): EmailBlock => ({ id: bid("b"), type: "button", label, url, align: "left", color: "#0e666a" });
const code = (): EmailBlock => ({ id: bid("c"), type: "code", title: "Your member code" });
const email = (subject: string, preheader: string, blocks: EmailBlock[]): EmailDoc => ({ subject, preheader, blocks });

const COL = 260;
const ROW = 150;
const pos = (row: number, col = 0) => ({ x: col * COL, y: row * ROW });
const at = pos;

/** A straight sequence: trigger → steps… → exit, laid out top to bottom. */
function chain(steps: FlowNode[]): FlowGraph {
  const nodes: FlowNode[] = [{ id: "trigger", type: "trigger", position: at(0), data: {} }, ...steps.map((s, i): FlowNode => ({ ...s, position: at(i + 1) }) as FlowNode), { id: "exit", type: "exit", position: at(steps.length + 1), data: {} }];
  return { nodes, edges: nodes.slice(1).map((n, i) => ({ id: `e${i}`, source: nodes[i].id, target: n.id })) };
}
const mail = (id: string, doc: EmailDoc): FlowNode => ({ id, type: "email", position: at(0), data: doc });
const wait = (id: string, days: number, hours = 0): FlowNode => ({ id, type: "wait", position: at(0), data: { days, hours } });

const LAYOUT_80: Record<string, { x: number; y: number }> = { "email-1": pos(1), "wait-1": pos(2), "email-2": pos(4, 1) };

const nextChapterAt80: FlowGraph = {
  nodes: [
    { id: "trigger", type: "trigger", position: pos(0), data: {} },
    mail(
      "email-1",
      email("{{dog_name}} is almost through {{chapter}}", "Your next chapter, with {{discount_percent}} off for you", [
        h("You're nearly there, {{first_name}}"),
        p("You and {{dog_name}} are close to the end of **{{chapter}}**. The work you've put in is exactly what **{{next_chapter}}** builds on."),
        p("As a member, you get {{discount_percent}} off {{next_chapter}}: {{discounted_price}} instead of {{price}}."),
        code(),
        btn("Continue to {{next_chapter}}"),
      ]),
    ),
    wait("wait-1", 3),
    { id: "check-1", type: "condition", position: pos(3), data: { check: "clicked" } },
    { id: "exit-yes", type: "exit", position: pos(4, -1), data: {} },
    mail(
      "email-2",
      email("Your {{discount_percent}} code ends {{discount_expires}}", "{{next_chapter}} is waiting for you and {{dog_name}}", [
        p("Hi {{first_name}},"),
        p("A quick reminder: your code for **{{next_chapter}}** is valid until {{discount_expires}}. When you finish {{chapter}}, {{next_chapter}} opens right away."),
        code(),
        btn("Get {{next_chapter}}"),
      ]),
    ),
    { id: "exit-no", type: "exit", position: pos(5, 1), data: {} },
  ].map((n): FlowNode => ({ ...n, position: LAYOUT_80[n.id] ?? n.position }) as FlowNode),
  edges: [
    { id: "e1", source: "trigger", target: "email-1" },
    { id: "e2", source: "email-1", target: "wait-1" },
    { id: "e3", source: "wait-1", target: "check-1" },
    { id: "e4", source: "check-1", target: "exit-yes", sourceHandle: "yes" },
    { id: "e5", source: "check-1", target: "email-2", sourceHandle: "no" },
    { id: "e6", source: "email-2", target: "exit-no" },
  ],
};

const chapterComplete = chain([
  mail(
    "email-1",
    email("You finished {{chapter}}! What's next for {{dog_name}}", "A thank-you from Roni, and {{discount_percent}} off {{next_chapter}}", [
      h("You did it, {{first_name}}!"),
      p("You and {{dog_name}} finished **{{chapter}}**. That's a real milestone, and your certificate is waiting in the app."),
      p("Ready for **{{next_chapter}}**? As a thank-you, here's {{discount_percent}} off: {{discounted_price}} instead of {{price}}."),
      code(),
      btn("Start {{next_chapter}}"),
    ]),
  ),
  wait("wait-1", 4),
  mail(
    "email-2",
    email("Still thinking about {{next_chapter}}?", "Your code ends {{discount_expires}}", [
      p("Hi {{first_name}},"),
      p("Just a nudge: your {{discount_percent}} code for {{next_chapter}} ends on {{discount_expires}}."),
      code(),
      btn("Get {{next_chapter}}"),
    ]),
  ),
]);

const welcomeSeries = chain([
  mail(
    "email-1",
    email("Welcome to {{chapter}}, {{first_name}}", "Here's how to get the most out of it with {{dog_name}}", [
      h("Welcome to {{chapter}}"),
      p("You and {{dog_name}} are in. Start with the first lesson; short, regular sessions work best, so five to ten minutes a day is plenty."),
      btn("Open your first lesson", "{{app_url}}"),
    ]),
  ),
  wait("wait-1", 2),
  mail(
    "email-2",
    email("Your first sessions with {{dog_name}}", "Tips from Roni for a great start", [
      p("Hi {{first_name}},"),
      p("A few things that help every team: practice at the same time of day, stop while {{dog_name}} still wants more, and log each session so you can see your rhythm."),
      btn("Plan your week", "{{app_url}}"),
    ]),
  ),
  wait("wait-2", 4),
  mail(
    "email-3",
    email("Send Roni a video of {{dog_name}}", "She replies with notes pinned to moments in your clip", [
      p("Hi {{first_name}},"),
      p("Once you've tried the first lessons, film a short clip and send it to Roni. She watches every video and replies with notes."),
      btn("Send a video", "{{app_url}}"),
    ]),
  ),
]);

const winBack = chain([
  mail(
    "email-1",
    email("{{dog_name}} misses your sessions", "Five minutes today is enough to get back into it", [
      p("Hi {{first_name}},"),
      p("It's been a little while since your last practice with {{dog_name}}. No pressure: one short session today keeps the progress you've made."),
      btn("Practice for 5 minutes", "{{app_url}}"),
    ]),
  ),
  wait("wait-1", 4),
  mail(
    "email-2",
    email("Pick up where you left off", "Your next lesson is waiting", [
      p("Hi {{first_name}},"),
      p("Your next lesson in {{chapter}} is ready whenever you are. Short and often beats long and rare."),
      btn("Open the app", "{{app_url}}"),
    ]),
  ),
]);

const abandonedCheckout = chain([
  mail(
    "email-1",
    email("Still thinking about {{offer_title}}?", "Your checkout is saved", [
      p("Hi {{first_name}},"),
      p("You started getting **{{offer_title}}** but didn't finish. If anything got in the way, just reply to this email and we'll help."),
      btn("Finish checkout"),
    ]),
  ),
  wait("wait-1", 1),
  mail(
    "email-2",
    email("A question before you start {{offer_title}}?", "Here's what members ask most", [
      p("Hi {{first_name}},"),
      p("Members usually ask how long sessions take (five to ten minutes) and whether it suits their dog's age (every lesson has a gentler option). Anything else? Reply and Roni's team will answer."),
      btn("Continue to {{offer_title}}"),
    ]),
  ),
]);

const quizLead = chain([
  mail(
    "email-1",
    email("Your Bonded journey starts here", "Thanks for taking the quiz", [
      h("Thanks for taking the quiz, {{first_name}}"),
      p("Based on your answers, the best place to start is **Bonded: Foundations**: trust, a shared language and everyday skills that everything else builds on."),
      btn("Create your free account", "{{app_url}}"),
    ]),
  ),
  wait("wait-1", 2),
  mail(
    "email-2",
    email("How Bonded works", "Short lessons, real feedback from Roni", [
      p("Hi {{first_name}},"),
      p("Bonded is short video lessons you practice with your dog, a plan that fits your week, and feedback from Roni on your own videos."),
      btn("See the journey", "{{app_url}}"),
    ]),
  ),
  wait("wait-2", 3),
  mail(
    "email-3",
    email("Ready to start with your dog?", "Your free account takes a minute", [
      p("Hi {{first_name}},"),
      p("Whenever you're ready, create your free account and start with the first lessons."),
      btn("Start now", "{{app_url}}"),
    ]),
  ),
]);

function template(key: string, name: string, description: string, trigger: FlowTrigger, graph: FlowGraph, extra: Partial<FlowTemplate> = {}): FlowTemplate {
  const d = triggerDef(trigger).defaults;
  return { key, name, description, trigger, triggerParams: {}, offer: d.offer, goal: d.goal, reentry: d.reentry, discountPercent: null, discountValidDays: null, graph, ...extra };
}

export const FLOW_TEMPLATES: readonly FlowTemplate[] = [
  template("next-chapter-80", "Next chapter at 80%", "Offer the next chapter with a personal code, and remind those who didn't click.", "chapter_progress", nextChapterAt80, {
    triggerParams: { percent: 80 },
    discountPercent: 20,
    discountValidDays: 7,
  }),
  template("chapter-complete", "Chapter completed", "Congratulations with an offer for the next chapter, and a reminder before the code ends.", "chapter_completed", chapterComplete, {
    discountPercent: 20,
    discountValidDays: 7,
  }),
  template("welcome", "Welcome series", "Three emails over a week that help a new member start strong.", "chapter_purchased", welcomeSeries),
  template("win-back", "Win back", "When a member stops practicing, two gentle nudges. They leave as soon as they practice.", "inactive_practice", winBack, { triggerParams: { days: 7 } }),
  template("abandoned-checkout", "Abandoned checkout", "Two emails when someone starts paying and doesn't finish.", "checkout_abandoned", abandonedCheckout, { triggerParams: { hours: 2 } }),
  template("quiz-lead", "Quiz lead nurture", "Three emails for people who took the quiz, inviting them to create an account.", "quiz_lead", quizLead),
];

/** A fresh step for the builder, placed at `position`. */
export function newNode(type: Exclude<FlowNodeType, "trigger">, id: string, position: { x: number; y: number }): FlowNode {
  switch (type) {
    case "wait":
      return { id, type, position, data: { days: 2, hours: 0 } };
    case "email":
      return { id, type, position, data: email("", "", [p("Hi {{first_name}},"), p(""), btn("Open the app", "{{app_url}}")]) };
    case "condition":
      return { id, type, position, data: { check: "opened" } };
    case "split":
      return { id, type, position, data: { percentA: 50 } };
    case "action":
      return { id, type, position, data: { action: "add_tag", tag: "" } };
    case "exit":
      return { id, type, position, data: {} };
  }
}
