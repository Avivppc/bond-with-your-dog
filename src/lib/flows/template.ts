import type { EmailNode } from "./graph";

/**
 * Personalisation for flow emails: {{first_name}}-style tags in the subject and text, filled per
 * member. Unknown tags render empty rather than leaking braces. Pure.
 */

export interface FlowVars {
  first_name: string;
  dog_name: string;
  chapter: string;
  next_chapter: string;
  price: string;
  discount_percent: string;
  discounted_price: string;
  discount_code: string;
  discount_expires: string;
  offer_url: string;
}

/** The tags the email editor offers, with what each one becomes. */
export const FLOW_TAGS: readonly { tag: keyof FlowVars; label: string; example: string }[] = [
  { tag: "first_name", label: "First name", example: "Dana" },
  { tag: "dog_name", label: "Dog's name", example: "Luna" },
  { tag: "chapter", label: "Chapter they're in", example: "Bonded: Foundations" },
  { tag: "next_chapter", label: "Next chapter", example: "Bonded: Moves" },
  { tag: "price", label: "Next chapter price", example: "$129" },
  { tag: "discount_percent", label: "Discount %", example: "20%" },
  { tag: "discounted_price", label: "Price with discount", example: "$103.20" },
  { tag: "discount_code", label: "Personal code", example: "BOND-7KQ4-M2XD" },
  { tag: "discount_expires", label: "Code expiry date", example: "October 10" },
  { tag: "offer_url", label: "Checkout link", example: "https://www.bonded.dog/checkout/moves?code=BOND-7KQ4-M2XD" },
];

export const EXAMPLE_VARS: FlowVars = Object.fromEntries(FLOW_TAGS.map((t) => [t.tag, t.example])) as unknown as FlowVars;

export function fillTags(text: string, vars: FlowVars): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, key: string) => (key in vars ? vars[key as keyof FlowVars] : ""));
}

/**
 * The email a member receives from an email step: subject and text with their details filled in.
 * The call-to-action becomes a "Label: url" line, which the email renderer turns into a button.
 */
export function renderFlowEmail(node: EmailNode["data"], vars: FlowVars): { subject: string; text: string } {
  const body = fillTags(node.body, vars).trim();
  const cta = node.ctaLabel.trim() && vars.offer_url ? `\n\n${fillTags(node.ctaLabel, vars).trim()}: ${vars.offer_url}` : "";
  return { subject: fillTags(node.subject, vars).trim(), text: `${body}${cta}` };
}
