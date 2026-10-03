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
  offer_title: string;
  lesson_title: string;
  app_url: string;
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
  { tag: "offer_title", label: "What's offered", example: "Bonded: Moves" },
  { tag: "lesson_title", label: "Lesson (lesson triggers)", example: "Building Trust" },
  { tag: "app_url", label: "Link to the app", example: "https://www.bonded.dog/home" },
];

/** Tags that are links: offered for buttons and image links rather than text. */
export const LINK_TAGS: readonly (keyof FlowVars)[] = ["offer_url", "app_url"];

export const EXAMPLE_VARS: FlowVars = Object.fromEntries(FLOW_TAGS.map((t) => [t.tag, t.example])) as unknown as FlowVars;

export function fillTags(text: string, vars: FlowVars): string {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, key: string) => (key in vars ? vars[key as keyof FlowVars] : ""));
}
